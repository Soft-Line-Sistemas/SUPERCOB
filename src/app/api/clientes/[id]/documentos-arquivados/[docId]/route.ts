import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import { isAdminRole } from '@/lib/admin-auth'
import { clienteDocumentPath as filePath, buildContentDisposition } from '@/lib/document-storage'

export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, docId } = await params
  try {
    const doc = await prisma.clienteDocumentoArquivado.findFirst({ where: { id: docId, clienteId: id } })
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    const p = filePath(id, doc.fileName)
    const data = await fs.readFile(p)
    const { searchParams } = new URL(req.url)
    const forceDownload = searchParams.get('download') === '1'

    return new NextResponse(data, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': buildContentDisposition(doc.originalName, forceDownload, doc.mimeType),
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar documento' }, { status: 500 })
  }
}
