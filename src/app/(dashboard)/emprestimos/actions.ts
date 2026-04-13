'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { logSystemAction } from '@/lib/audit'

export async function getEmprestimos(filters?: {
  status?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  usuarioId?: string;
  cobrancaOnly?: boolean;
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  // Regra: GERENTE vê apenas os próprios contratos. ADM e ESCRITORIO veem tudo.
  const where: any = role === 'GERENTE' ? { usuarioId: userId } : {}

  if (role !== 'GERENTE' && filters?.usuarioId && filters.usuarioId.trim() !== '') {
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

  if (filters?.cobrancaOnly) {
    where.cobrancaAtiva = true
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
      cobrancaAtiva: true,
      jurosPagos: true,
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

  // Se for GERENTE, o empréstimo é automaticamente atribuído a ele
  // Se for ADMIN/ADM, ele pode atribuir a qualquer um (passado no data.usuarioId)
  const usuarioId = role === 'GERENTE' ? userId : data.usuarioId

  const emprestimo = await prisma.emprestimo.create({
    data: {
      ...data,
      usuarioId,
      status,
    },
  })

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimo.id,
    acao: 'CREATE',
    detalhes: `Contrato de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor)} criado.`,
    depois: emprestimo
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

  const before = await prisma.emprestimo.findUnique({ where: { id } })

  const emprestimo = await prisma.emprestimo.update({
    where: { id },
    data: {
      ...data,
      status,
    },
  })

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimo.id,
    acao: 'UPDATE',
    detalhes: `Contrato atualizado via formulário.`,
    antes: before,
    depois: emprestimo
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

export async function toggleCobrancaAtiva(id: string, active: boolean) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  await prisma.emprestimo.update({
    where: { id },
    data: { cobrancaAtiva: active }
  })
  revalidatePath('/emprestimos')
}
