'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getEmprestimos(filters?: {
  status?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  usuarioId?: string;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where: any = role === 'OPERADOR' ? { usuarioId: userId } : {}

  if (role !== 'OPERADOR' && filters?.usuarioId && filters.usuarioId.trim() !== '') {
    if (filters.usuarioId === '__UNASSIGNED__') where.usuarioId = null
    else where.usuarioId = filters.usuarioId
  }

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.q && filters.q.trim() !== '') {
    const q = filters.q.trim()
    const digits = q.replace(/\D/g, '')
    where.cliente = {
      OR: [
        { nome: { contains: q } },
        { email: { contains: q } },
        digits ? { whatsapp: { contains: digits } } : undefined,
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
    select: {
      id: true,
      clienteId: true,
      usuarioId: true,
      valor: true,
      valorPago: true,
      jurosMes: true,
      vencimento: true,
      quitadoEm: true,
      status: true,
      observacao: true,
      createdAt: true,
      cliente: {
        select: { nome: true, email: true, whatsapp: true },
      },
      usuario: {
        select: { nome: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
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
