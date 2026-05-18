import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { whatsappService } from '@/lib/whatsapp-client'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'

  try {
    if (refresh) {
      await whatsappService.resetSession()
    }

    const status = await whatsappService.getQrStatus(refresh ? 12000 : 4000)
    const isReady = status.ready || whatsappService.isReady()
    const qrAvailable = Boolean(status.qr)
    const authenticatedPending = !isReady && !qrAvailable && whatsappService.isAuthenticated()

    return NextResponse.json({
      ready: isReady,
      qrAvailable,
      qr: status.qr,
      generatedAt: status.generatedAt,
      message: isReady
        ? 'Cliente já conectado ao WhatsApp'
        : qrAvailable
          ? 'QR gerado. Escaneie para conectar.'
          : authenticatedPending
            ? 'Sessão autenticada. Aguardando WhatsApp ficar pronto.'
            : 'Aguardando geração de um novo QR.',
    })
  } catch (error) {
    console.error('Erro ao obter QR do WhatsApp:', error)
    return NextResponse.json(
      { error: 'Não foi possível obter o QR do WhatsApp no momento' },
      { status: 503 },
    )
  }
}
