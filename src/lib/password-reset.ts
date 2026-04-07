import crypto from 'crypto'

export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function resolveAppUrl() {
  const url = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return url.replace(/\/+$/, '')
}

