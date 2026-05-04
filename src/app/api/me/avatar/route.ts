import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { parseMultipartFileFromRequest } from '@/lib/multipart'

const MAX_SIZE = 5 * 1024 * 1024

function getExtension(mimeType: string) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = (session.user as any).id
  const exists = await prisma.usuario.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Usuário ainda não está cadastrado no banco de dados.' }, { status: 404 })

  try {
    const file = await parseMultipartFileFromRequest(req, 'file')
    if (!file) return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 })
    if (!file.mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo inválido. Envie uma imagem.' }, { status: 400 })
    }
    if (file.data.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Imagem muito grande. Máximo: 5MB.' }, { status: 400 })
    }

    const ext = getExtension(file.mimeType)
    const dir = path.join(process.cwd(), 'public', 'avatar', id)
    await mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `avatar.${ext}`)
    await writeFile(filePath, file.data)

    const avatarUrl = `/avatar/${id}/avatar.${ext}?v=${Date.now()}`
    const updated = await prisma.usuario.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    })

    revalidatePath('/perfil')
    revalidatePath('/dashboard')
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar foto' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = (session.user as any).id
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, avatarUrl: true },
  })
  if (!user) return NextResponse.json({ error: 'Usuário ainda não está cadastrado no banco de dados.' }, { status: 404 })

  const current = user.avatarUrl ? user.avatarUrl.split('?')[0] : null
  if (current && current.startsWith('/avatar/')) {
    const rel = current.replace(/^\/+/, '')
    const filePath = path.join(process.cwd(), 'public', rel)
    try {
      await unlink(filePath)
    } catch {
    }
  }

  const updated = await prisma.usuario.update({
    where: { id },
    data: { avatarUrl: null },
    select: { id: true, avatarUrl: true },
  })

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return NextResponse.json(updated)
}
