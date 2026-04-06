import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function parseYMD(value: string | null) {
  if (!value) return null
  const v = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const [y, m, d] = v.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return { y, m, d, ymd: v }
}

function addDaysYMD(ymd: string, days: number) {
  const p = parseYMD(ymd)
  if (!p) return ymd
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0, 0))
  base.setUTCDate(base.getUTCDate() + days)
  const yyyy = base.getUTCFullYear()
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(base.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function saoPauloDayStartUtc(ymd: string) {
  const p = parseYMD(ymd)
  if (!p) return new Date()
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 3, 0, 0, 0))
}

function todayYMDInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function csvEscape(value: unknown) {
  const s = String(value ?? '')
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const role = (session.user as any).role as 'ADMIN' | 'OPERADOR'
  const userId = (session.user as any).id as string

  if (role === 'OPERADOR') {
    const allowed = await prisma.emprestimo.findFirst({ where: { clienteId: id, usuarioId: userId }, select: { id: true } })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const startYMD = parseYMD(url.searchParams.get('startDate'))?.ymd ?? addDaysYMD(todayYMDInSaoPaulo(), -180)
  const endYMD = parseYMD(url.searchParams.get('endDate'))?.ymd ?? todayYMDInSaoPaulo()

  const rangeStartUtc = saoPauloDayStartUtc(startYMD)
  const rangeEndExclusiveUtc = saoPauloDayStartUtc(addDaysYMD(endYMD, 1))

  const cliente = await prisma.cliente.findUnique({ where: { id }, select: { nome: true } })
  if (!cliente) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const emprestimos = await prisma.emprestimo.findMany({
    where: {
      clienteId: id,
      OR: [
        { vencimento: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
        { vencimento: null, createdAt: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      vencimento: true,
      quitadoEm: true,
      status: true,
      observacao: true,
      createdAt: true,
      usuario: { select: { nome: true } },
    },
  })

  const headers = ['id', 'status', 'valor', 'valorPago', 'saldo', 'jurosMes', 'vencimento', 'quitadoEm', 'createdAt', 'responsavel', 'observacao']
  const lines = [headers.join(',')]

  for (const e of emprestimos) {
    const saldo = e.status === 'CANCELADO' ? 0 : Math.max(e.valor - (e.valorPago ?? 0), 0)
    lines.push([
      `COB-${e.id.slice(0, 6).toUpperCase()}`,
      e.status,
      e.valor,
      e.valorPago ?? 0,
      saldo,
      e.jurosMes ?? 0,
      e.vencimento ? e.vencimento.toISOString() : '',
      e.quitadoEm ? e.quitadoEm.toISOString() : '',
      e.createdAt.toISOString(),
      e.usuario?.nome ?? '',
      e.observacao ?? '',
    ].map(csvEscape).join(','))
  }

  const csv = lines.join('\n')
  const fileName = `cliente-${id}-historico.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}

