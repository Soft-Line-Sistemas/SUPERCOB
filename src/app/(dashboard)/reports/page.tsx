import { Reports } from '@/components/Reports'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

const SAO_PAULO_OFFSET_HOURS = 3

function parseYMD(value: unknown) {
  if (typeof value !== 'string') return null
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

function addMonthsYMD(ymd: string, months: number) {
  const p = parseYMD(ymd)
  if (!p) return ymd
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0, 0))
  base.setUTCMonth(base.getUTCMonth() + months)
  const yyyy = base.getUTCFullYear()
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(base.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function saoPauloDayStartUtc(ymd: string) {
  const p = parseYMD(ymd)
  if (!p) return new Date()
  return new Date(Date.UTC(p.y, p.m - 1, p.d, SAO_PAULO_OFFSET_HOURS, 0, 0, 0))
}

function todayYMDInSaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const startDateParam = Array.isArray(params.startDate) ? params.startDate[0] : params.startDate
  const endDateParam = Array.isArray(params.endDate) ? params.endDate[0] : params.endDate
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status
  const cidadeParam = Array.isArray(params.cidade) ? params.cidade[0] : params.cidade
  const estadoParam = Array.isArray(params.estado) ? params.estado[0] : params.estado
  const usuarioIdParam = Array.isArray(params.usuarioId) ? params.usuarioId[0] : params.usuarioId

  const todayYMD = todayYMDInSaoPaulo()
  const defaultEndYMD = todayYMD
  const defaultStartYMD = addMonthsYMD(defaultEndYMD, -6)

  let startYMD = parseYMD(startDateParam)?.ymd ?? defaultStartYMD
  let endYMD = parseYMD(endDateParam)?.ymd ?? defaultEndYMD
  if (startYMD > endYMD) {
    const tmp = startYMD
    startYMD = endYMD
    endYMD = tmp
  }

  const rangeStartUtc = saoPauloDayStartUtc(startYMD)
  const rangeEndExclusiveUtc = saoPauloDayStartUtc(addDaysYMD(endYMD, 1))

  const where: any = {
    OR: [
      { vencimento: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
      { vencimento: null, createdAt: { gte: rangeStartUtc, lt: rangeEndExclusiveUtc } },
    ],
  }

  if (statusParam && typeof statusParam === 'string' && statusParam.trim() !== '') {
    where.status = statusParam
  }

  if ((cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') || (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '')) {
    where.cliente = {}
    if (cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') {
      where.cliente.cidade = { contains: cidadeParam }
    }
    if (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '') {
      where.cliente.estado = { contains: estadoParam }
    }
  }

  if (usuarioIdParam && typeof usuarioIdParam === 'string' && usuarioIdParam.trim() !== '') {
    where.usuarioId = usuarioIdParam === '__UNASSIGNED__' ? null : usuarioIdParam
  }

  const [loans, colaboradores] = await Promise.all([
    prisma.emprestimo.findMany({
    where,
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      status: true,
      vencimento: true,
      createdAt: true,
      clienteId: true,
        usuarioId: true,
      cliente: {
        select: { nome: true, cidade: true, estado: true },
      },
    },
    }),
    prisma.usuario.findMany({ where: { role: 'OPERADOR' }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  const expectedInterest = (valor: number, jurosMes: number | null) => valor * (((jurosMes ?? 0) as number) / 100)

  let principalAtivo = 0
  let principalTotal = 0
  let projectedInterest = 0
  for (const loan of loans) {
    principalTotal += loan.valor
    if (loan.status !== 'QUITADO' && loan.status !== 'CANCELADO') {
      const restante = Math.max(loan.valor - (loan.valorPago ?? 0), 0)
      principalAtivo += restante
      projectedInterest += expectedInterest(restante, loan.jurosMes)
    }
  }

  const totalProjetado = principalAtivo + projectedInterest

  const endForMonth = new Date(rangeEndExclusiveUtc)
  endForMonth.setUTCDate(endForMonth.getUTCDate() - 1)
  const monthStart = new Date(Date.UTC(endForMonth.getUTCFullYear(), endForMonth.getUTCMonth(), 1, 0, 0, 0, 0))
  const nextMonthStart = new Date(Date.UTC(endForMonth.getUTCFullYear(), endForMonth.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  const yearStart = new Date(Date.UTC(endForMonth.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
  const nextYearStart = new Date(Date.UTC(endForMonth.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0))

  let jurosMes = 0
  let jurosAno = 0
  for (const loan of loans) {
    const interestBase = loan.status !== 'QUITADO' && loan.status !== 'CANCELADO' ? Math.max(loan.valor - (loan.valorPago ?? 0), 0) : 0
    const interest = interestBase > 0 ? expectedInterest(interestBase, loan.jurosMes) : 0
    const refDate = loan.vencimento ?? loan.createdAt
    if (refDate >= monthStart && refDate < nextMonthStart) jurosMes += interest
    if (refDate >= yearStart && refDate < nextYearStart) jurosAno += interest
  }

  const byMonth = new Map<string, { date: Date; juros: number }>()
  for (const loan of loans) {
    const base = loan.vencimento ?? loan.createdAt
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 0, 0, 0, 0))
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    const current = byMonth.get(key) ?? { date: d, juros: 0 }
    const interestBase = loan.status !== 'QUITADO' && loan.status !== 'CANCELADO' ? Math.max(loan.valor - (loan.valorPago ?? 0), 0) : 0
    const interest = interestBase > 0 ? expectedInterest(interestBase, loan.jurosMes) : 0
    current.juros += interest
    byMonth.set(key, current)
  }
  const interestByMonth = Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-6)
    .map((x) => ({ month: monthLabel(x.date), juros: Math.round(x.juros) }))

  const byLocation = new Map<string, number>()
  for (const loan of loans) {
    if (loan.status === 'CANCELADO') continue
    const city = loan.cliente.cidade ?? ''
    const state = loan.cliente.estado ?? ''
    const label = [city, state].filter(Boolean).join(', ')
    if (!label) continue
    byLocation.set(label, (byLocation.get(label) ?? 0) + loan.valor)
  }
  const volumeByLocation = Array.from(byLocation.entries())
    .map(([city, volume]) => ({ city, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 6)

  const byClient = new Map<string, { nome: string; city: string; volume: number }>()
  for (const loan of loans) {
    if (loan.status === 'CANCELADO') continue
    const city = [loan.cliente.cidade, loan.cliente.estado].filter(Boolean).join('/')
    const current = byClient.get(loan.clienteId) ?? { nome: loan.cliente.nome, city, volume: 0 }
    current.volume += loan.valor
    byClient.set(loan.clienteId, current)
  }
  const clientVolumes = Array.from(byClient.values()).sort((a, b) => b.volume - a.volume)
  const totalVolume = clientVolumes.reduce((acc, c) => acc + c.volume, 0) || 1
  const topClients = clientVolumes.slice(0, 12)
  const prefixSums = topClients.map((_, idx) => topClients.slice(0, idx + 1).reduce((acc, x) => acc + x.volume, 0))
  const abcCurveData = topClients.map((c, idx) => {
    const cumulative = prefixSums[idx]
    const pct = cumulative / totalVolume
    const cls = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C'
    return {
      rank: idx + 1,
      client: c.nome,
      city: c.city || '-',
      volume: Math.round(c.volume),
      class: cls as 'A' | 'B' | 'C',
      acc: `${Math.round(pct * 100)}%`,
    }
  })

  const now2 = new Date()
  const defaultersData = loans
    .filter((l) => l.status !== 'QUITADO' && l.status !== 'CANCELADO' && l.vencimento && l.vencimento.getTime() < now2.getTime())
    .map((l) => {
      const daysLate = Math.floor((now2.getTime() - (l.vencimento as Date).getTime()) / (1000 * 60 * 60 * 24))
      const restante = Math.max(l.valor - (l.valorPago ?? 0), 0)
      return {
        id: `COB-${l.id.slice(0, 6).toUpperCase()}`,
        client: l.cliente.nome,
        city: [l.cliente.cidade, l.cliente.estado].filter(Boolean).join('/'),
        daysLate,
        amount: Math.round(restante),
      }
    })
    .filter((x) => x.daysLate > 5)
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, 12)

  const report = {
    kpis: {
      principalAtivo: Math.round(principalAtivo),
      totalProjetado: Math.round(totalProjetado),
      jurosMes: Math.round(jurosMes),
      jurosAno: Math.round(jurosAno),
    },
    interestByMonth,
    volumeByLocation,
    abcCurveData,
    defaultersData,
  }

  return (
    <Reports
      report={report as any}
      colaboradores={colaboradores}
      filters={{
        startDate: startYMD,
        endDate: endYMD,
        status: (statusParam as string) || '',
        cidade: (cidadeParam as string) || '',
        estado: (estadoParam as string) || '',
        usuarioId: (usuarioIdParam as string) || '',
      }}
    />
  )
}
