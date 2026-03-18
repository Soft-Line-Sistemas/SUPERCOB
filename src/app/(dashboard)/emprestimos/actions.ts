'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getEmprestimos(filters?: {
  status?: string;
  email?: string;
  whatsapp?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where: any = role === 'OPERADOR' ? { usuarioId: userId } : {}

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.email || filters?.whatsapp) {
    where.cliente = {
      OR: [
        filters.email ? { email: { contains: filters.email } } : undefined,
        filters.whatsapp ? { whatsapp: { contains: filters.whatsapp } } : undefined,
      ].filter(Boolean),
    }
  }

  if (filters?.startDate && filters?.endDate) {
    where.createdAt = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    }
  }

  return await prisma.emprestimo.findMany({
    where,
    include: {
      cliente: true,
      usuario: {
        select: { nome: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createEmprestimo(data: {
  clienteId: string;
  valor: number;
  jurosMes?: number;
  vencimento?: Date | null;
  observacao?: string;
  quitadoEm?: Date | null;
  usuarioId?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  // Se for OPERADOR, o empréstimo é automaticamente atribuído a ele
  // Se for ADMIN, ele pode atribuir a qualquer um (passado no data.usuarioId)
  const usuarioId = role === 'OPERADOR' ? userId : data.usuarioId

  const emprestimo = await prisma.emprestimo.create({
    data: {
      ...data,
      usuarioId,
      status,
    },
  })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  return emprestimo
}

export async function updateEmprestimo(id: string, data: {
  valor: number;
  jurosMes?: number;
  vencimento?: Date | null;
  observacao?: string;
  quitadoEm?: Date | null;
  usuarioId?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
  
  if (data.quitadoEm) {
    status = 'QUITADO'
  } else if (data.observacao && data.observacao.trim() !== '') {
    status = 'NEGOCIACAO'
  }

  const emprestimo = await prisma.emprestimo.update({
    where: { id },
    data: {
      ...data,
      status,
    },
  })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
  return emprestimo
}

export async function deleteEmprestimo(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  await prisma.emprestimo.delete({
    where: { id },
  })
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')
}
