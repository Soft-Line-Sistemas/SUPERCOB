import { Reports } from '@/components/Reports'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { calculateLoanInterest } from '@/lib/loan-interest'
import { calculateCurrentInstallment, calculateCurrentInstallmentAmounts } from '@/lib/installments'

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

function addMonthlyOccurrence(date: Date, preferredDay: number) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const lastDayOfNextMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(
    year,
    month,
    Math.min(preferredDay, lastDayOfNextMonth),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ))
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
  
  const role = ((session.user as any).role as string)?.toUpperCase()

  const isOffice = role === 'ESCRITORIO'
  // Escritório acessa somente os relatórios necessários à rotina de cobrança.
  if (role !== 'ADM' && role !== 'ADMIN' && !isOffice) redirect('/dashboard')

  const params = await searchParams
  const startDateParam = Array.isArray(params.startDate) ? params.startDate[0] : params.startDate
  const endDateParam = Array.isArray(params.endDate) ? params.endDate[0] : params.endDate
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status
  const cidadeParam = Array.isArray(params.cidade) ? params.cidade[0] : params.cidade
  const estadoParam = Array.isArray(params.estado) ? params.estado[0] : params.estado
  const usuarioIdParam = Array.isArray(params.usuarioId) ? params.usuarioId[0] : params.usuarioId
  const upcomingDaysParam = Array.isArray(params.upcomingDays) ? params.upcomingDays[0] : params.upcomingDays
  const nextDuePerContractParam = Array.isArray(params.nextDuePerContract) ? params.nextDuePerContract[0] : params.nextDuePerContract
  const includeInadimplentesParam = Array.isArray(params.includeInadimplentes) ? params.includeInadimplentes[0] : params.includeInadimplentes
  const includePaidParam = Array.isArray(params.includePaid) ? params.includePaid[0] : params.includePaid
  const parsedUpcomingDays = Number(upcomingDaysParam)
  const upcomingDays = Number.isInteger(parsedUpcomingDays) && parsedUpcomingDays >= 1 && parsedUpcomingDays <= 3650
    ? parsedUpcomingDays
    : 30
  const nextDuePerContract = nextDuePerContractParam !== 'false'
  const includeInadimplentes = includeInadimplentesParam === 'true'
  const includePaid = includePaidParam === 'true'

  const todayYMD = todayYMDInSaoPaulo()
  const todayStart = saoPauloDayStartUtc(todayYMD)
  const upcomingEnd = saoPauloDayStartUtc(addDaysYMD(todayYMD, upcomingDays + 1))
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

  if (usuarioIdParam && typeof usuarioIdParam === 'string' && usuarioIdParam.trim() !== '') {
    where.usuarioId = usuarioIdParam === '__UNASSIGNED__' ? null : usuarioIdParam
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
      valorPago: true,
      jurosMes: true,
      jurosAtrasoDia: true,
      status: true,
      vencimento: true,
      createdAt: true,
      clienteId: true,
      usuarioId: true,
      jurosPagos: true,
      jurosPagosNoInicioCiclo: true,
      jurosCicloIniciadoEm: true,
      cliente: {
        select: { nome: true, cidade: true, estado: true },
      },
    },
  })

  const colaboradores = await prisma.usuario.findMany({
    where: { role: { in: ['GERENTE', 'ESCRITORIO'] } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  // "Dia de Vencimento": agenda de cobrança por dia do mês, ignora o filtro de período
  // (é uma agenda recorrente, não presa ao range de datas selecionado na tela).
  const dueDayWhere: any = {
    status: statusParam && typeof statusParam === 'string' && statusParam.trim() !== ''
      ? statusParam
      : { in: ['ABERTO', 'NEGOCIACAO'] },
    vencimento: { not: null },
  }
  if (usuarioIdParam && typeof usuarioIdParam === 'string' && usuarioIdParam.trim() !== '') {
    dueDayWhere.usuarioId = usuarioIdParam === '__UNASSIGNED__' ? null : usuarioIdParam
  }
  if ((cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') || (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '')) {
    dueDayWhere.cliente = {}
    if (cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') {
      dueDayWhere.cliente.cidade = { contains: cidadeParam }
    }
    if (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '') {
      dueDayWhere.cliente.estado = { contains: estadoParam }
    }
  }

  const dueDayLoans = await prisma.emprestimo.findMany({
    where: dueDayWhere,
    select: {
      id: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      jurosAtrasoDia: true,
      jurosPagos: true,
      jurosPagosNoInicioCiclo: true,
      jurosCicloIniciadoEm: true,
      quantidadeParcelas: true,
      status: true,
      vencimento: true,
      createdAt: true,
      cliente: { select: { nome: true } },
    },
  })

  const dueDayGroups = new Map<number, { client: string; jurosAtual: number; isAcordo: boolean; parcelaAtual: number; parcelaTotal: number; valorParcela: number }[]>()
  for (const loan of dueDayLoans) {
    if (!loan.vencimento) continue
    let nextOccurrence = new Date(loan.vencimento)
    const preferredDay = nextOccurrence.getUTCDate()
    while (nextOccurrence.getTime() < todayStart.getTime()) {
      nextOccurrence = addMonthlyOccurrence(nextOccurrence, preferredDay)
    }
    if (!nextDuePerContract && nextOccurrence.getTime() >= upcomingEnd.getTime()) continue
    const day = nextOccurrence.getUTCDate()
    const interest = calculateLoanInterest(loan)
    const quantidadeParcelas = loan.quantidadeParcelas ?? 0
    const isAcordo = Number.isInteger(quantidadeParcelas) && quantidadeParcelas > 0
    let parcelaAtual = 0
    let parcelaTotal = 0
    let valorParcela = 0
    if (isAcordo) {
      const progress = calculateCurrentInstallment({ ...loan, status: loan.status })
      const amounts = calculateCurrentInstallmentAmounts(loan)
      parcelaAtual = progress?.current ?? 0
      parcelaTotal = progress?.total ?? quantidadeParcelas
      valorParcela = amounts?.valorParcela ?? 0
    }
    const entry = {
      client: loan.cliente.nome,
      jurosAtual: Math.round(interest.jurosBase),
      isAcordo,
      parcelaAtual,
      parcelaTotal,
      valorParcela: Math.round(valorParcela),
    }
    const list = dueDayGroups.get(day) ?? []
    list.push(entry)
    dueDayGroups.set(day, list)
  }

  const dueDayData = Array.from(dueDayGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, entries]) => ({
      day,
      entries: entries.sort((a, b) => a.client.localeCompare(b.client, 'pt-BR')),
    }))
  const monthId = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth()
  const startOfMonthUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))

  let principalAtivo = 0
  let principalTotal = 0
  let projectedInterest = 0
  for (const loan of loans) {
    principalTotal += loan.valor
    if (loan.status !== 'QUITADO' && loan.status !== 'CANCELADO') {
      const restante = Math.max(loan.valor - (loan.valorPago ?? 0), 0)
      principalAtivo += restante
      projectedInterest += calculateLoanInterest(loan).jurosPendente
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
  const monthBuckets: Date[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(endForMonth.getUTCFullYear(), endForMonth.getUTCMonth() - i, 1, 0, 0, 0, 0))
    monthBuckets.push(d)
  }

  const interestByMonth = monthBuckets.map((d) => ({ month: monthLabel(d), juros: 0 }))

  for (const loan of loans) {
    if (loan.status === 'QUITADO' || loan.status === 'CANCELADO') continue
    const restante = Math.max(loan.valor - (loan.valorPago ?? 0), 0)
    if (restante <= 0) continue
    const base = loan.vencimento ?? loan.createdAt
    const baseMonth = startOfMonthUtc(base)
    for (let i = 0; i < monthBuckets.length; i++) {
      const bucket = monthBuckets[i]
      if (monthId(bucket) < monthId(baseMonth)) continue
      const perMonth = calculateLoanInterest({ ...loan, now: bucket }).jurosBase
      interestByMonth[i].juros += perMonth
    }
  }

  for (const item of interestByMonth) item.juros = Math.round(item.juros)
  jurosMes = interestByMonth[interestByMonth.length - 1]?.juros ?? 0
  jurosAno = interestByMonth
    .filter((x, idx) => monthBuckets[idx].getUTCFullYear() === endForMonth.getUTCFullYear())
    .reduce((acc, x) => acc + x.juros, 0)

  const byLocation = new Map<string, number>()
  for (const loan of loans) {
    if (loan.status === 'CANCELADO') continue
    const city = loan.cliente.cidade ?? ''
    const state = loan.cliente.estado ?? ''
    const label = [city, state].filter(Boolean).join(', ')
    if (!label) continue
    byLocation.set(label, (byLocation.get(label) ?? 0) + loan.valor)
  }
  const volumeByLocationFull = Array.from(byLocation.entries())
    .map(([city, volume]) => ({ city, volume }))
    .sort((a, b) => b.volume - a.volume)
  const volumeByLocation = volumeByLocationFull.slice(0, 6)

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
  const buildAbcCurve = (clients: typeof clientVolumes) => {
    const prefixSums = clients.map((_, idx) => clients.slice(0, idx + 1).reduce((acc, x) => acc + x.volume, 0))
    return clients.map((c, idx) => {
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
  }
  const abcCurveDataFull = buildAbcCurve(clientVolumes)
  const abcCurveData = buildAbcCurve(clientVolumes.slice(0, 12))

  const now2 = new Date()
  const defaultersDataFull = loans
    .filter((l) => l.status !== 'QUITADO' && l.status !== 'CANCELADO' && l.vencimento && l.vencimento.getTime() < now2.getTime())
    .map((l) => {
      const daysLate = Math.floor((now2.getTime() - (l.vencimento as Date).getTime()) / (1000 * 60 * 60 * 24))
      const totalDevido = calculateLoanInterest(l).totalDevido
      return {
        id: `COB-${l.id.slice(0, 6).toUpperCase()}`,
        client: l.cliente.nome,
        city: [l.cliente.cidade, l.cliente.estado].filter(Boolean).join('/'),
        daysLate,
        amount: Math.round(totalDevido),
      }
    })
    .filter((x) => x.amount > 0)
    .filter((x) => x.daysLate > 5)
    .sort((a, b) => b.daysLate - a.daysLate)
  const defaultersData = defaultersDataFull.slice(0, 12)

  const dailyInterestData: { date: string; dateObj: Date; client: string; loanId: string; amount: number; isPaid: boolean }[] = []
  const upcomingWhere: any = {
    status: { in: ['ABERTO', 'NEGOCIACAO'] },
    vencimento: { not: null },
    jurosMes: { gt: 0 },
  }
  if (statusParam === 'ABERTO' || statusParam === 'NEGOCIACAO') upcomingWhere.status = statusParam
  if (usuarioIdParam && typeof usuarioIdParam === 'string' && usuarioIdParam.trim() !== '') {
    upcomingWhere.usuarioId = usuarioIdParam === '__UNASSIGNED__' ? null : usuarioIdParam
  }
  if ((cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') || (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '')) {
    upcomingWhere.cliente = {}
    if (cidadeParam && typeof cidadeParam === 'string' && cidadeParam.trim() !== '') upcomingWhere.cliente.cidade = { contains: cidadeParam }
    if (estadoParam && typeof estadoParam === 'string' && estadoParam.trim() !== '') upcomingWhere.cliente.estado = { contains: estadoParam }
  }

  const upcomingLoans = await prisma.emprestimo.findMany({
    where: upcomingWhere,
    select: { id: true, valor: true, jurosMes: true, jurosPagos: true, vencimento: true, cliente: { select: { nome: true } } },
  })

  for (const loan of upcomingLoans) {
    let occurrence = new Date(loan.vencimento!)
    const preferredDay = occurrence.getUTCDate()
    let occurrenceIndex = 1
    while (occurrence.getTime() < todayStart.getTime()) {
      occurrence = addMonthlyOccurrence(occurrence, preferredDay)
      occurrenceIndex++
    }

    if (!nextDuePerContract && occurrence.getTime() >= upcomingEnd.getTime()) continue
    const monthlyAmount = Number(loan.valor) * (Number(loan.jurosMes) / 100)
    dailyInterestData.push({
      date: occurrence.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      dateObj: occurrence,
      client: loan.cliente.nome,
      loanId: `COB-${loan.id.slice(0, 6).toUpperCase()}`,
      amount: monthlyAmount,
      isPaid: Number(loan.jurosPagos || 0) >= monthlyAmount * occurrenceIndex - 0.01,
    })
  }

  // Ordenar por data decrescente
  dailyInterestData.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())

  const report = {
    kpis: {
      principalAtivo: Math.round(principalAtivo),
      totalProjetado: Math.round(totalProjetado),
      jurosMes: Math.round(jurosMes),
      jurosAno: Math.round(jurosAno),
    },
    interestByMonth,
    volumeByLocation,
    volumeByLocationFull,
    abcCurveData,
    abcCurveDataFull,
    defaultersData,
    defaultersDataFull,
    dailyInterestData: dailyInterestData.map(({ dateObj, ...rest }) => rest),
    dueDayData,
  }

  // Não serializar dados gerenciais para a visão de Escritório. A permissão na
  // interface complementa esta separação dos dados enviados ao navegador.
  const reportForViewer = isOffice
    ? {
        kpis: { principalAtivo: 0, totalProjetado: 0, jurosMes: 0, jurosAno: 0 },
        interestByMonth: [],
        volumeByLocation: [],
        abcCurveData: [],
        defaultersData,
        defaultersDataFull,
        dailyInterestData: report.dailyInterestData,
        dueDayData,
      }
    : report

  return (
    <Reports
      report={reportForViewer as any}
      accessLevel={isOffice ? 'office' : 'admin'}
      colaboradores={colaboradores}
      filters={{
        startDate: startYMD,
        endDate: endYMD,
        status: (statusParam as string) || '',
        cidade: (cidadeParam as string) || '',
        estado: (estadoParam as string) || '',
        usuarioId: (usuarioIdParam as string) || '',
        upcomingDays,
        nextDuePerContract,
        includeInadimplentes,
        includePaid,
      }}
    />
  )
}
