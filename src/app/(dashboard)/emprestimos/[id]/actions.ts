'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addEmprestimoHistorico(input: { emprestimoId: string; descricao: string }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const descricao = input.descricao?.trim()
  if (!descricao) throw new Error('Descrição é obrigatória')

  const createdById = (session.user as any).id as string | undefined

  const evento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao,
      createdById,
    },
    include: {
      createdBy: { select: { nome: true } },
    },
  })

  revalidatePath(`/emprestimos/${input.emprestimoId}`)
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')

  return evento
}

export async function setEmprestimoStatus(input: {
  emprestimoId: string
  status: 'CANCELADO' | 'QUITADO'
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const createdById = (session.user as any).id as string | undefined

  const updated = await prisma.emprestimo.update({
    where: { id: input.emprestimoId },
    data: {
      status: input.status,
      quitadoEm: input.status === 'QUITADO' ? new Date() : null,
    },
  })

  const evento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao: input.status === 'QUITADO' ? 'Status alterado para concluído.' : 'Status alterado para cancelado.',
      createdById,
    },
    include: {
      createdBy: { select: { nome: true } },
    },
  })

  revalidatePath(`/emprestimos/${input.emprestimoId}`)
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')

  return { emprestimo: updated, evento }
}
