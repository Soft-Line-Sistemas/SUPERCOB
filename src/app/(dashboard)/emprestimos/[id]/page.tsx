import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { ContractDetails } from './ui'
import { processInterestAccrual } from '@/lib/interest-engine'
import { isAdminRole } from '@/lib/admin-auth'

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
        },
        whatsappDispatches: {
          include: { rule: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      }
    }),
    isAdminRole(role) ? prisma.usuario.findMany({ 
      where: { isActive: true }, 
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' }
    }) : Promise.resolve([])
  ])

  if (!loan) notFound()

  // Gerência e Operador só veem os próprios contratos.
  if ((role === 'GERENTE' || role === 'OPERADOR') && loan.usuarioId !== userId) redirect('/emprestimos')

  // Mapeamento para o tipo esperado pelo componente de UI
  const eventosWhatsapp = loan.whatsappDispatches.map((d) => ({
    id: `wpp-${d.id}`,
    descricao:
      d.status === 'SENT'
        ? `Cobrança WhatsApp enviada (${d.triggerMode}) • Regra: ${d.rule?.title || '-'}`
        : `Falha no WhatsApp (${d.triggerMode}) • Regra: ${d.rule?.title || '-'} • ${d.errorMessage || 'Erro não informado'}`,
    createdAt: d.sentAt || d.attemptedAt || d.createdAt,
    tipo: 'COBRANCA_WPP',
    createdBy: { nome: d.triggerMode === 'MANUAL' ? 'Operador' : 'Automação' },
  }))

  const emprestimoParaUI = {
    ...loan,
    historico: [...loan.historico, ...eventosWhatsapp].sort(
      (a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
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
