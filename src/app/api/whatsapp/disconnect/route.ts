import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { whatsappService } from '@/lib/whatsapp-client'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await whatsappService.resetSession()
    return NextResponse.json({ success: true, message: 'WhatsApp desconectado com sucesso' })
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error)
    return NextResponse.json({ error: 'Falha ao desconectar WhatsApp' }, { status: 500 })
  }
}
