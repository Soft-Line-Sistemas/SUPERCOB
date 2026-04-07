'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { hashResetToken } from '@/lib/password-reset'

export async function resetPassword(token: string, newPassword: string) {
  const t = (token ?? '').trim()
  if (!t) throw new Error('Token inválido')
  if (newPassword.trim().length < 6) throw new Error('Nova senha muito curta')

  const tokenHash = hashResetToken(t)
  const now = new Date()

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  })

  if (!row || row.usedAt || row.expiresAt.getTime() < now.getTime()) {
    throw new Error('Token inválido ou expirado')
  }

  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: row.userId }, data: { senha: hashed } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: now } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null, id: { not: row.id } } }),
  ])

  return { ok: true as const }
}

