'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

export async function getMyProfile() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true, avatarUrl: true },
  })
  if (user) return user
  return {
    id,
    nome: (session.user as any).nome ?? session.user.name ?? 'Usuário',
    email: session.user.email ?? '',
    role: (session.user as any).role ?? 'OPERADOR',
    avatarUrl: null,
  }
}

export async function uploadMyAvatar(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const exists = await prisma.usuario.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new Error('Usuário ainda não está cadastrado no banco de dados.')

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Selecione uma imagem.')
  if (!file.type.startsWith('image/')) throw new Error('Arquivo inválido. Envie uma imagem.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo: 5MB.')

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg'

  const dir = path.join(process.cwd(), 'public', 'avatar', id)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `avatar.${ext}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const avatarUrl = `/avatar/${id}/avatar.${ext}?v=${Date.now()}`
  const updated = await prisma.usuario.update({
    where: { id },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true },
  })

  revalidatePath('/perfil')
  revalidatePath('/dashboard')
  return updated
}

export async function removeMyAvatar() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, avatarUrl: true },
  })
  if (!user) throw new Error('Usuário ainda não está cadastrado no banco de dados.')

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
  return updated
}

export async function updateMyPassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, senha: true },
  })
  if (!user) throw new Error('Usuário ainda não está cadastrado no banco de dados.')

  const ok = await bcrypt.compare(currentPassword, user.senha)
  if (!ok) throw new Error('Senha atual inválida')

  if (newPassword.trim().length < 6) throw new Error('Nova senha muito curta')
  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.usuario.update({
    where: { id },
    data: { senha: hashed },
  })

  revalidatePath('/perfil')
  return { ok: true }
}
