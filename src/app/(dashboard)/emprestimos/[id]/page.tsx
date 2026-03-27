import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { ContractDetails } from './ui'

export default async function EmprestimoDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const role = (session.user as any).role as 'ADMIN' | 'OPERADOR'
  const userId = (session.user as any).id as string

  const where = role === 'OPERADOR' ? { id, usuarioId: userId } : { id }

  const emprestimo = await prisma.emprestimo.findFirst({
    where,
    include: {
      cliente: true,
      usuario: { select: { nome: true } },
      historico: {
        orderBy: { createdAt: 'asc' },
        include: { createdBy: { select: { nome: true } } },
      },
    },
  })

  if (!emprestimo) notFound()

  return <ContractDetails emprestimo={emprestimo as any} />
}
