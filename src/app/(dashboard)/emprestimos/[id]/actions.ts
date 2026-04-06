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

  if (input.status === 'QUITADO') {
    const atual = await prisma.emprestimo.findUnique({
      where: { id: input.emprestimoId },
      select: { valor: true, valorPago: true, status: true },
    })
    if (!atual) throw new Error('Contrato não encontrado')
    if (atual.status === 'CANCELADO') throw new Error('Contrato cancelado')
    const pago = Number(atual.valorPago ?? 0) || 0
    if (pago < atual.valor) throw new Error('Não é possível concluir: contrato ainda não está quitado')
  }

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

export async function addPagamentoParcial(input: { emprestimoId: string; valor: number }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const valor = Number(input.valor)
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Valor inválido')

  const createdById = (session.user as any).id as string | undefined

  const emprestimoAtual = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if (!emprestimoAtual) throw new Error('Contrato não encontrado')
  if (emprestimoAtual.status === 'CANCELADO') throw new Error('Contrato cancelado')

  const novoPago = (emprestimoAtual.valorPago || 0) + valor
  const quitado = novoPago >= emprestimoAtual.valor

  const updated = await prisma.emprestimo.update({
    where: { id: input.emprestimoId },
    data: {
      valorPago: novoPago,
      status: quitado ? 'QUITADO' : emprestimoAtual.status,
      quitadoEm: quitado ? new Date() : emprestimoAtual.quitadoEm,
    },
  })

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const eventoPagamento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao: `Pagamento parcial registrado: ${fmt.format(valor)}.`,
      createdById,
    },
    include: { createdBy: { select: { nome: true } } },
  })

  let eventoQuitacao: typeof eventoPagamento | null = null
  if (quitado && emprestimoAtual.status !== 'QUITADO') {
    eventoQuitacao = await prisma.emprestimoHistorico.create({
      data: {
        emprestimoId: input.emprestimoId,
        descricao: 'Contrato quitado automaticamente após pagamento parcial.',
        createdById,
      },
      include: { createdBy: { select: { nome: true } } },
    })
  }

  revalidatePath(`/emprestimos/${input.emprestimoId}`)
  revalidatePath('/emprestimos')
  revalidatePath('/dashboard')

  return { emprestimo: updated, eventos: [eventoPagamento, ...(eventoQuitacao ? [eventoQuitacao] : [])] }
}
