import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

function filePath(clienteId: string, fileName: string) {
  return path.join(process.cwd(), 'uploads', 'clientes', clienteId, fileName)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, docId } = await params
  try {
    const doc = await prisma.clienteDocumento.findFirst({ where: { id: docId, clienteId: id } })
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    const p = filePath(id, doc.fileName)
    const data = await fs.readFile(p)
    return new NextResponse(data, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': /pdf|image\//.test(doc.mimeType) ? 'inline' : `attachment; filename="${doc.originalName}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar documento' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, docId } = await params
  try {
    const doc = await prisma.clienteDocumento.findFirst({ where: { id: docId, clienteId: id } })
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    const p = filePath(id, doc.fileName)
    await prisma.clienteDocumento.delete({ where: { id: doc.id } })
    await fs.rm(p, { force: true })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 })
  }
}

