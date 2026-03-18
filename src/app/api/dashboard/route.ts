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
    const [openCount, negotiationCount, paidCount] = await Promise.all([
      prisma.emprestimo.count({ where: { ...where, status: 'ABERTO' } }),
      prisma.emprestimo.count({ where: { ...where, status: 'NEGOCIACAO' } }),
      prisma.emprestimo.count({ where: { ...where, status: 'QUITADO' } }),
    ])

    const totalClients = role === 'OPERADOR' 
      ? await prisma.cliente.count({ where: { loans: { some: { usuarioId: userId } } } })
      : await prisma.cliente.count()

    const [openAmount, negotiationAmount, paidAmount] = await Promise.all([
      prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, status: 'ABERTO' } }),
      prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, status: 'NEGOCIACAO' } }),
      prisma.emprestimo.aggregate({ _sum: { valor: true }, where: { ...where, status: 'QUITADO' } }),
    ])

    const statusDistribution = [
      { name: 'Aberto', value: openCount, color: '#9CA3AF' },
      { name: 'Negociação', value: negotiationCount, color: '#EAB308' },
      { name: 'Quitado', value: paidCount, color: '#22C55E' },
    ].filter(s => s.value > 0)

    let agentData: { name: string; value: number; color: string }[] = []
    if (role === 'ADMIN') {
      const agents = await prisma.usuario.findMany({
        where: { role: 'OPERADOR' },
        include: { _count: { select: { emprestimos: true } } }
      })
      
      const colors = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A']
      agentData = agents.map((agent, i) => ({
        name: agent.nome,
        value: agent._count.emprestimos,
        color: colors[i % colors.length]
      })).filter(a => a.value > 0)
    }

    return NextResponse.json({
      metrics: {
        open: { count: openCount, amount: openAmount._sum.valor || 0 },
        negotiation: { count: negotiationCount, amount: negotiationAmount._sum.valor || 0 },
        paid: { count: paidCount, amount: paidAmount._sum.valor || 0 },
        totalClients,
      },
      statusDistribution,
      agentData,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
