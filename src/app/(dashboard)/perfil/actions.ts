'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
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

  const after = await prisma.usuario.findUnique({
    where: { id },
    select: { senha: true },
  })
  if (!after) throw new Error('Falha ao salvar nova senha')
  const check = await bcrypt.compare(newPassword, after.senha)
  if (!check) throw new Error('Falha ao salvar nova senha')

  revalidatePath('/perfil')
  return { ok: true }
}
