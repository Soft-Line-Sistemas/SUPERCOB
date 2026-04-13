import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { ContractDetails } from './ui'
import { processInterestAccrual } from '@/lib/interest-engine'

export default async function EmprestimoDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  
  // Gatilho automático para lançar juros pendentes ao abrir a página (Server Side)
  await processInterestAccrual(id).catch(console.error)

  const role = (session.user as any).role as string
  const userId = (session.user as any).id as string

  const [loan, allUsers] = await Promise.all([
    prisma.emprestimo.findUnique({
      where: { id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nome: true } },
        historico: {
          include: { createdBy: { select: { nome: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    role === 'ADM' ? prisma.usuario.findMany({ 
      where: { isActive: true }, 
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' }
    }) : Promise.resolve([])
  ])

  if (!loan) notFound()

  // Verificação de permissão (Gerente só vê os seus)
  if (role === 'GERENTE' && loan.usuarioId !== userId) redirect('/emprestimos')

  // Mapeamento para o tipo esperado pelo componente de UI
  const emprestimoParaUI = {
    ...loan,
    historico: loan.historico
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-4 md:py-8">
      <ContractDetails 
        emprestimo={emprestimoParaUI as any} 
        myRole={role} 
        availableUsers={allUsers}
      />
    </div>
  )
}
