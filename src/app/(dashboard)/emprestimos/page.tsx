import { Loans } from '@/components/Loans'
import { getEmprestimos } from './actions'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
// import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card'
// import { Receipt } from 'lucide-react'


export default async function EmprestimosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const params = await searchParams
  const filters = {
    status: params.status as string,
    q: params.q as string,
    startDate: params.startDate as string,
    endDate: params.endDate as string,
    usuarioId: params.usuarioId as string,
  }
  const clienteId = params.clienteId as string
  const role = (session?.user as any)?.role as 'ADMIN' | 'OPERADOR'
  const userId = (session?.user as any)?.id as string

  const includeIds = clienteId ? [clienteId] : []

  const [emprestimos, clientes, colaboradores] = await Promise.all([
    getEmprestimos(filters),
    prisma.cliente.findMany({
      where:
        role === 'OPERADOR'
          ? {
              OR: [
                { loans: { some: { usuarioId: userId } } },
                ...(includeIds.length ? [{ id: { in: includeIds } }] : []),
              ],
            }
          : includeIds.length
            ? { id: { in: includeIds } }
            : undefined,
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, nome: true, email: true, whatsapp: true },
    }),
    prisma.usuario.findMany({
      where: { role: 'OPERADOR' },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])
  let analytics: any[] = []
  if (role === 'ADMIN') {
    const analyticsWhere: any = {}
    if (filters.status) analyticsWhere.status = filters.status
    if (filters.startDate && filters.endDate) {
      analyticsWhere.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      }
    }
    if (filters.usuarioId) {
      analyticsWhere.usuarioId = filters.usuarioId === '__UNASSIGNED__' ? null : filters.usuarioId
    }

    const grouped = await prisma.emprestimo.groupBy({
      by: ['usuarioId', 'status'],
      where: { ...analyticsWhere, usuarioId: { not: null } },
      _count: { _all: true },
    })

    const byUser = new Map<string, { ABERTO: number; NEGOCIACAO: number; QUITADO: number }>()
    for (const row of grouped) {
      const uid = row.usuarioId as string
      const current = byUser.get(uid) ?? { ABERTO: 0, NEGOCIACAO: 0, QUITADO: 0 }
      const key = row.status as 'ABERTO' | 'NEGOCIACAO' | 'QUITADO'
      if (key in current) current[key] += row._count._all
      byUser.set(uid, current)
    }

    analytics = colaboradores
      .map((c) => {
        const counts = byUser.get(c.id) ?? { ABERTO: 0, NEGOCIACAO: 0, QUITADO: 0 }
        return {
          id: c.id,
          nome: c.nome,
          aberto: counts.ABERTO,
          negociacao: counts.NEGOCIACAO,
          quitado: counts.QUITADO,
          total: counts.ABERTO + counts.NEGOCIACAO + counts.QUITADO,
        }
      })
      .filter((a) => a.total > 0)
  }

  return (
    <div className="space-y-6">
      {/* <Card className="border-0 bg-gradient-to-r from-blue-600 to-green-700 text-white shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-white tracking-tight"> <Receipt /> Gestão de Cobranças</CardTitle>
          <CardDescription className="text-black/70 mt-2 text-base">
            Controle a carteira, acompanhe negociações e quitações.
          </CardDescription>
        </CardHeader>
      </Card> */}
      <Loans 
        initialLoans={emprestimos as any} 
        clientes={clientes.map(c => ({ id: c.id, nome: c.nome, email: c.email, whatsapp: c.whatsapp }))} 
        colaboradores={colaboradores}
        userRole={(session?.user as any)?.role}
        analytics={analytics}
      />
    </div>
  )
}
