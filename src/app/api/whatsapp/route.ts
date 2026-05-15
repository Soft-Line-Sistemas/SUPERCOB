import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { whatsappService } from '@/lib/whatsapp-client'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { to, message } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Faltando parâmetros obrigatórios (to, message)' }, { status: 400 })
    }

    const result = await whatsappService.sendMessage(to, message)

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { to, message, ...result },
    })
  } catch (error) {
    console.error('Erro na integração do WhatsApp:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar envio de mensagem' },
      { status: 500 },
    )
  }
}
