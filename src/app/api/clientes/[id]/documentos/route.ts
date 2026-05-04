import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { parseMultipartFileFromRequest } from '@/lib/multipart'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'application/pdf'])

function safeBaseName(name: string) {
  return name.replace(/[^\w\-\.\u00C0-\u017F]+/g, '_')
}

function uploadsDir(clienteId: string) {
  return path.join(process.cwd(), 'uploads', 'clientes', clienteId)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const docs = await prisma.clienteDocumento.findMany({
      where: { clienteId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, originalName: true, fileName: true, mimeType: true, size: true, createdAt: true },
    })
    return NextResponse.json(docs.map((d) => ({
      ...d,
      url: `/api/clientes/${id}/documentos/${d.id}`,
    })))
  } catch {
    return NextResponse.json({ error: 'Erro ao listar documentos' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const file = await parseMultipartFileFromRequest(req, 'file')
    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    }
    if (!ALLOWED.has(file.mimeType)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
    }
    if (file.data.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Tamanho máximo excedido (5MB)' }, { status: 400 })
    }

    const dir = uploadsDir(id)
    await fs.mkdir(dir, { recursive: true })

    const ext = file.fileName.split('.').pop()?.toLowerCase() || ''
    const stamp = Date.now()
    const rand = crypto.randomBytes(6).toString('hex')
    const base = safeBaseName(path.basename(file.fileName, `.${ext}`))
    const fileName = `cliente-${id}-${stamp}-${rand}-${base}.${ext}`
    await fs.writeFile(path.join(dir, fileName), file.data)

    const saved = await prisma.clienteDocumento.create({
      data: {
        clienteId: id,
        originalName: file.fileName,
        fileName,
        mimeType: file.mimeType,
        size: file.data.byteLength,
      },
    })

    return NextResponse.json({
      id: saved.id,
      originalName: saved.originalName,
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      size: saved.size,
      createdAt: saved.createdAt,
      url: `/api/clientes/${id}/documentos/${saved.id}`,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao enviar documento' }, { status: 500 })
  }
}
