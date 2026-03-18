'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function getMyProfile() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true, avatarUrl: true },
  })
  if (!user) throw new Error('User not found')
  return user
}

export async function updateMyAvatar(avatarUrl: string | null) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const id = (session.user as any).id
  const updated = await prisma.usuario.update({
    where: { id },
    data: { avatarUrl: avatarUrl && avatarUrl.trim() !== '' ? avatarUrl.trim() : null },
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
  if (!user) throw new Error('User not found')

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

