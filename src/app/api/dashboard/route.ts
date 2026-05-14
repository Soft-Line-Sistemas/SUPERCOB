import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where: any = role === 'OPERADOR' ? { usuarioId: userId } : {}

  try {
    const loans = await prisma.emprestimo.findMany({
      where,
      select: {
        valor: true,
        valorPago: true,
        jurosPagos: true,
        status: true,
        jurosMes: true,
        vencimento: true,
        createdAt: true,
      }
    })

    const metrics = loans.reduce((acc, loan) => {
      const principal = Number(loan.valor) || 0
      const pago = Number(loan.valorPago || 0) || 0
      const jurosPagos = Number(loan.jurosPagos || 0) || 0
      const aberto = Math.max(principal - pago, 0)

      if (loan.status === 'ABERTO' || loan.status === 'NEGOCIACAO') {
        acc.principalAtivo += aberto
        acc.openCount++
      } else if (loan.status === 'QUITADO') {
        acc.totalRecuperado += principal
        acc.paidCount++
      }
      
      acc.rentabilidade += jurosPagos
      return acc
    }, { principalAtivo: 0, totalRecuperado: 0, rentabilidade: 0, openCount: 0, paidCount: 0 })

    const totalClients = role === 'OPERADOR' 
      ? await prisma.cliente.count({ where: { loans: { some: { usuarioId: userId } } } })
      : await prisma.cliente.count()

    const taxaRecuperacao = metrics.paidCount + metrics.openCount > 0 
      ? ((metrics.paidCount / (metrics.paidCount + metrics.openCount)) * 100).toFixed(1)
      : '0'

    const statusDistribution = [
      { name: 'Aberto', value: metrics.openCount, color: '#D4AF37' }, // Gold
      { name: 'Quitado', value: metrics.paidCount, color: '#22C55E' },
    ].filter(s => s.value > 0)

    let agentData: { name: string; value: number; color: string }[] = []
    if (role === 'ADMIN') {
      const agents = await prisma.usuario.findMany({
        where: { role: 'OPERADOR' },
        include: { _count: { select: { emprestimos: true } } }
      })
      
      const colors = ['#D4AF37', '#B8860B', '#996515', '#FFD700']
      agentData = agents.map((agent, i) => ({
        name: agent.nome,
        value: agent._count.emprestimos,
        color: colors[i % colors.length]
      })).filter(a => a.value > 0)
    }

    return NextResponse.json({
      metrics: {
        open: { count: metrics.openCount, amount: metrics.principalAtivo },
        paid: { count: metrics.paidCount, amount: metrics.totalRecuperado },
        rentabilidade: metrics.rentabilidade,
        totalClients,
        taxaRecuperacao,
      },
      statusDistribution,
      agentData,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
