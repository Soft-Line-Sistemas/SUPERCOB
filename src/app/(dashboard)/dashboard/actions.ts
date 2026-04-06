'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

type DashboardPeriod = 'hoje' | 'semana' | 'mes'

function parseYMD(value: string) {
  const v = value.trim()
  const [y, m, d] = v.split('-').map((x) => Number(x))
  return { y, m, d }
}

function addMonthsYMD(ymd: string, months: number) {
  const p = parseYMD(ymd)
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0, 0))
  base.setUTCMonth(base.getUTCMonth() + months)
  const yyyy = base.getUTCFullYear()
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(base.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function saoPauloMonthStartUtc(ymd: string) {
  const p = parseYMD(ymd)
  return new Date(Date.UTC(p.y, p.m - 1, 1, 3, 0, 0, 0))
}

function monthKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(date)
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'short' }).format(date).replace('.', '')
}

function getRange(period: DashboardPeriod) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  if (period === 'hoje') {
    const end = new Date(startOfToday)
    end.setDate(end.getDate() + 1)
    return { start: startOfToday, end }
  }

  if (period === 'semana') {
    const start = new Date(startOfToday)
    start.setDate(start.getDate() - 6)
    const end = new Date(startOfToday)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
  return { start, end }
}

export async function getDashboardData(period: DashboardPeriod = 'hoje') {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where: any = role === 'OPERADOR' ? { usuarioId: userId } : {}
  const { start, end } = getRange(period)
  const dateWhere = { createdAt: { gte: start, lt: end } }

  const [openCount, negotiationCount, paidCount] = await Promise.all([
    prisma.emprestimo.count({ where: { ...where, ...dateWhere, status: 'ABERTO' } }),
    prisma.emprestimo.count({ where: { ...where, ...dateWhere, status: 'NEGOCIACAO' } }),
    prisma.emprestimo.count({ where: { ...where, ...dateWhere, status: 'QUITADO' } }),
  ])

  const clientesDistinct = await prisma.emprestimo.findMany({
    where: { ...where, ...dateWhere },
    distinct: ['clienteId'],
    select: { clienteId: true },
  })
  const totalClients = clientesDistinct.length

  const [openAmount, negotiationAmount, paidAmount] = await Promise.all([
    prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, ...dateWhere, status: 'ABERTO' } }),
    prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, ...dateWhere, status: 'NEGOCIACAO' } }),
    prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, ...dateWhere, status: 'QUITADO' } }),
  ])

  // Get total loans
  const totalLoans = await prisma.emprestimo.count({ where: { ...where, ...dateWhere } })
  const taxaRecuperacao = totalLoans > 0 ? (paidCount / totalLoans) * 100 : 0

  // Calculate expected interest (Juros Esperados)
  const loansWithInterest = await prisma.emprestimo.findMany({
    where: { ...where, ...dateWhere, status: { notIn: ['QUITADO', 'CANCELADO'] } },
    select: { valor: true, valorPago: true, jurosMes: true, vencimento: true, createdAt: true }
  })
  
  const jurosEsperados = loansWithInterest.reduce((acc, loan) => {
    const restante = Math.max(loan.valor - (loan.valorPago ?? 0), 0)
    if (restante <= 0) return acc
    const base = loan.vencimento ?? loan.createdAt
    const now = new Date()
    const months = Math.max(1, (now.getUTCFullYear() * 12 + now.getUTCMonth()) - (base.getUTCFullYear() * 12 + base.getUTCMonth()) + 1)
    return acc + (restante * ((loan.jurosMes || 0) / 100)) * months
  }, 0)

  // Get status distribution for pie chart
  const statusDistribution = [
    { name: 'Aberto', value: openCount, color: '#9CA3AF' }, // Gray-400
    { name: 'Negociação', value: negotiationCount, color: '#EAB308' }, // Yellow-500
    { name: 'Quitado', value: paidCount, color: '#22C55E' }, // Green-500
  ].filter(s => s.value > 0)

  const todayYMD = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const endYMD = todayYMD
  const startYMD = addMonthsYMD(`${endYMD.slice(0, 7)}-01`, -5)
  const evoStart = saoPauloMonthStartUtc(startYMD)
  const evoEnd = new Date(saoPauloMonthStartUtc(`${endYMD.slice(0, 7)}-01`))
  evoEnd.setUTCMonth(evoEnd.getUTCMonth() + 1)

  const paidLoansForEvolution = await prisma.emprestimo.findMany({
    where: {
      ...where,
      status: 'QUITADO',
      OR: [
        { quitadoEm: { gte: evoStart, lt: evoEnd } },
        { quitadoEm: null, createdAt: { gte: evoStart, lt: evoEnd } },
      ],
    },
    select: { valor: true, valorPago: true, quitadoEm: true, createdAt: true },
  })

  const byMonth = new Map<string, number>()
  for (const loan of paidLoansForEvolution) {
    const ref = (loan.quitadoEm ?? loan.createdAt) as Date
    const key = monthKey(ref)
    const value = Number(loan.valorPago ?? loan.valor) || 0
    byMonth.set(key, (byMonth.get(key) ?? 0) + value)
  }

  const evolutionData: { name: string; valor: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const ymd = addMonthsYMD(`${endYMD.slice(0, 7)}-01`, -i)
    const start = saoPauloMonthStartUtc(ymd)
    const key = monthKey(start)
    evolutionData.push({ name: monthLabel(start), valor: Math.round(byMonth.get(key) ?? 0) })
  }

  // Agent segmentation for Admin
  let agentData: { name: string; value: number; color: string }[] = []
  if (role === 'ADMIN') {
    const agents = await prisma.usuario.findMany({
      where: { role: 'OPERADOR' },
      select: { id: true, nome: true },
    })

    const emprestimosPorAgente = await prisma.emprestimo.groupBy({
      by: ['usuarioId'],
      where: { ...dateWhere, usuarioId: { in: agents.map((a) => a.id) } },
      _count: { _all: true },
    })

    const countById = new Map<string, number>()
    for (const row of emprestimosPorAgente) {
      if (row.usuarioId) countById.set(row.usuarioId, row._count._all)
    }
    
    const colors = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A']
    agentData = agents
      .map((agent, i) => ({
        name: agent.nome,
        value: countById.get(agent.id) ?? 0,
        color: colors[i % colors.length],
      }))
      .filter((a) => a.value > 0)
  }

  return {
    metrics: {
      open: { count: openCount, amount: openAmount._sum.valor || 0 },
      negotiation: { count: negotiationCount, amount: negotiationAmount._sum.valor || 0 },
      paid: { count: paidCount, amount: paidAmount._sum.valor || 0 },
      totalClients,
      taxaRecuperacao: taxaRecuperacao.toFixed(1),
      jurosEsperados,
    },
    statusDistribution,
    agentData,
    evolutionData,
  }
}
