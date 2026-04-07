'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'
import { generateResetToken, hashResetToken, resolveAppUrl } from '@/lib/password-reset'

export async function requestPasswordReset(email: string) {
  const normalized = (email ?? '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return { ok: true as const }

  const user = await prisma.usuario.findUnique({ where: { email: normalized }, select: { id: true, email: true, nome: true } })
  if (!user) return { ok: true as const }

  const token = generateResetToken()
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
    select: { id: true },
  })

  const appUrl = resolveAppUrl()
  const link = `${appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`
  const subject = 'Recuperação de senha - SUPERCOB'
  const text = `Olá, ${user.nome}.\n\nUse o link para redefinir sua senha:\n${link}\n\nEste link expira em 1 hora.\n`
  const html = `<p>Olá, <strong>${user.nome}</strong>.</p><p>Use o link abaixo para redefinir sua senha:</p><p><a href="${link}">${link}</a></p><p>Este link expira em 1 hora.</p>`

  const sent = await sendEmail({ to: user.email, subject, text, html })
  if (sent.ok) return { ok: true as const }

  if (process.env.NODE_ENV !== 'production') {
    return { ok: true as const, previewLink: link }
  }

  return { ok: true as const }
}

