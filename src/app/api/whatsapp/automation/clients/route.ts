import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(10, Number(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where: any = {}
  if (q) {
    const digits = q.replace(/\D/g, '')
    where.OR = [
      { nome: { contains: q } },
      digits ? { whatsapp: { contains: digits } } : undefined,
      digits ? { cpf: { contains: digits } } : undefined,
    ].filter(Boolean)
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nome: 'asc' },
      include: {
        whatsappPrefs: true,
        loans: {
          where: { status: { in: ['ABERTO', 'NEGOCIACAO'] } },
          select: { id: true, status: true, vencimento: true, valor: true, valorPago: true, cobrancaAtiva: true },
        },
      },
    }),
    prisma.cliente.count({ where }),
  ])

  const items = clientes.map((cliente) => {
    const pref = cliente.whatsappPrefs[0]
    return {
      id: cliente.id,
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      enabled: pref ? pref.enabled : true,
      allowRecurrence: pref ? pref.allowRecurrence : true,
      pausedAt: pref?.pausedAt || null,
      activeLoans: cliente.loans.length,
      activeChargeLoans: cliente.loans.filter((l) => l.cobrancaAtiva).length,
      totalOpen: cliente.loans.reduce((acc, l) => acc + Math.max(Number(l.valor || 0) - Number(l.valorPago || 0), 0), 0),
    }
  })

  return NextResponse.json({ items, total, page, limit, hasMore: skip + items.length < total })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const clienteId = String(body.clienteId || '')
  if (!clienteId) {
    return NextResponse.json({ error: 'clienteId é obrigatório' }, { status: 400 })
  }

  const enabled = body.enabled == null ? true : Boolean(body.enabled)
  const allowRecurrence = body.allowRecurrence == null ? true : Boolean(body.allowRecurrence)

  const pref = await prisma.whatsappAutomationClientPreference.upsert({
    where: { clienteId },
    create: {
      clienteId,
      enabled,
      allowRecurrence,
      pausedAt: enabled ? null : new Date(),
      pauseReason: enabled ? null : 'Pausado manualmente',
    },
    update: {
      enabled,
      allowRecurrence,
      pausedAt: enabled ? null : new Date(),
      pauseReason: enabled ? null : 'Pausado manualmente',
    },
  })

  return NextResponse.json(pref)
}
