import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { loadWhatsappAutomationQueue } from '@/lib/whatsapp-automation-queue'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureWhatsappAutomationSeed()

  const queue = await loadWhatsappAutomationQueue()
  if (!queue) {
    return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
  }
  return NextResponse.json(queue)
}
