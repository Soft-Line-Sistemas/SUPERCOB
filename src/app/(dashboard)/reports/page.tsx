import { Reports } from '@/components/Reports'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

function parseDateOrUndefined(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
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

  const params = await searchParams
  const startDateParam = Array.isArray(params.startDate) ? params.startDate[0] : params.startDate
  const endDateParam = Array.isArray(params.endDate) ? params.endDate[0] : params.endDate
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status
  const cidadeParam = Array.isArray(params.cidade) ? params.cidade[0] : params.cidade
  const estadoParam = Array.isArray(params.estado) ? params.estado[0] : params.estado

  const parsedStart = parseDateOrUndefined(startDateParam)
  const parsedEnd = parseDateOrUndefined(endDateParam)

  const now = new Date()
  const defaultEnd = startOfDay(addDays(now, 1))
  const defaultStart = new Date(defaultEnd)
  defaultStart.setMonth(defaultStart.getMonth() - 6)

  const rangeStart = parsedStart ? startOfDay(parsedStart) : defaultStart
  const rangeEndExclusive = parsedEnd ? startOfDay(addDays(parsedEnd, 1)) : defaultEnd

  const where: any = {
    createdAt: { gte: rangeStart, lt: rangeEndExclusive },
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

  const loans = await prisma.emprestimo.findMany({
    where,
    select: {
      id: true,
      valor: true,
      jurosMes: true,
      status: true,
      vencimento: true,
      createdAt: true,
      clienteId: true,
      cliente: {
        select: { nome: true, cidade: true, estado: true },
      },
    },
  })

  const expectedInterest = (valor: number, jurosMes: number | null) => valor * (((jurosMes ?? 0) as number) / 100)

  let principalAtivo = 0
  let principalTotal = 0
  let projectedInterest = 0
  for (const loan of loans) {
    principalTotal += loan.valor
    if (loan.status !== 'QUITADO') {
      principalAtivo += loan.valor
      projectedInterest += expectedInterest(loan.valor, loan.jurosMes)
    }
  }

  const totalProjetado = principalAtivo + projectedInterest

  const endForMonth = new Date(rangeEndExclusive)
  endForMonth.setDate(endForMonth.getDate() - 1)
  const monthStart = new Date(endForMonth.getFullYear(), endForMonth.getMonth(), 1, 0, 0, 0, 0)
  const nextMonthStart = new Date(endForMonth.getFullYear(), endForMonth.getMonth() + 1, 1, 0, 0, 0, 0)
  const yearStart = new Date(endForMonth.getFullYear(), 0, 1, 0, 0, 0, 0)
  const nextYearStart = new Date(endForMonth.getFullYear() + 1, 0, 1, 0, 0, 0, 0)

  let jurosMes = 0
  let jurosAno = 0
  for (const loan of loans) {
    const interest = loan.status !== 'QUITADO' ? expectedInterest(loan.valor, loan.jurosMes) : 0
    if (loan.createdAt >= monthStart && loan.createdAt < nextMonthStart) jurosMes += interest
    if (loan.createdAt >= yearStart && loan.createdAt < nextYearStart) jurosAno += interest
  }

  const byMonth = new Map<string, { date: Date; juros: number }>()
  for (const loan of loans) {
    const d = new Date(loan.createdAt.getFullYear(), loan.createdAt.getMonth(), 1, 0, 0, 0, 0)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const current = byMonth.get(key) ?? { date: d, juros: 0 }
    const interest = loan.status !== 'QUITADO' ? expectedInterest(loan.valor, loan.jurosMes) : 0
    current.juros += interest
    byMonth.set(key, current)
  }
  const interestByMonth = Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-6)
    .map((x) => ({ month: monthLabel(x.date), juros: Math.round(x.juros) }))

  const byLocation = new Map<string, number>()
  for (const loan of loans) {
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
    .filter((l) => l.status !== 'QUITADO' && l.vencimento && l.vencimento.getTime() < now2.getTime())
    .map((l) => {
      const daysLate = Math.floor((now2.getTime() - (l.vencimento as Date).getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: `COB-${l.id.slice(0, 6).toUpperCase()}`,
        client: l.cliente.nome,
        city: [l.cliente.cidade, l.cliente.estado].filter(Boolean).join('/'),
        daysLate,
        amount: Math.round(l.valor),
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
      filters={{
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: addDays(rangeEndExclusive, -1).toISOString().slice(0, 10),
        status: (statusParam as string) || '',
        cidade: (cidadeParam as string) || '',
        estado: (estadoParam as string) || '',
      }}
    />
  )
}
