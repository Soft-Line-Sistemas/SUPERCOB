'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logSystemAction } from '@/lib/audit'

export async function addEmprestimoHistorico(input: { emprestimoId: string; descricao: string }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const descricao = input.descricao?.trim()
  if (!descricao) throw new Error('Descrição é obrigatória')

  const createdById = (session.user as any).id as string | undefined
  
  // Transição automática de status: ABERTO -> NEGOCIACAO ao registrar histórico (contato feito)
  const currentLoan = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if (currentLoan?.status === 'ABERTO') {
    await prisma.emprestimo.update({
      where: { id: input.emprestimoId },
      data: { status: 'NEGOCIACAO' }
    })
  }

  const evento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao,
      createdById,
      tipo: 'NOTA'
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
      tipo: 'SISTEMA'
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

  // --- REGRAS DE CÁLCULO DE JUROS (Sincronizado com UI) ---
  const principalRestante = Math.max(emprestimoAtual.valor - (emprestimoAtual.valorPago || 0), 0)
  const jurosPercent = Number(emprestimoAtual.jurosMes ?? 0) || 0
  const jurosMensalValor = principalRestante * (jurosPercent / 100)
  
  const monthId = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth()
  const now = new Date()
  const baseDate = new Date((emprestimoAtual.vencimento ?? emprestimoAtual.createdAt) as any)
  const monthsLate = baseDate.getTime() <= now.getTime() ? Math.max(1, monthId(now) - monthId(baseDate) + 1) : 0
  
  const jurosAcumuladoTotal = jurosMensalValor * monthsLate
  const jurosPendente = Math.max(jurosAcumuladoTotal - (emprestimoAtual.jurosPagos || 0), 0)
  // --------------------------------------------------------

  let pagamentoParaJuros = 0
  let pagamentoParaPrincipal = 0

  if (valor <= jurosPendente) {
    // Pagamento cobre apenas parte ou o total do juros pendente
    pagamentoParaJuros = valor
    pagamentoParaPrincipal = 0
  } else {
    // Pagamento cobre todo o juros e o resto vai para o principal
    pagamentoParaJuros = jurosPendente
    pagamentoParaPrincipal = valor - jurosPendente
  }

  const novoJurosPagos = (emprestimoAtual.jurosPagos || 0) + pagamentoParaJuros
  const novoValorPago = (emprestimoAtual.valorPago || 0) + pagamentoParaPrincipal
  const quitado = novoValorPago >= emprestimoAtual.valor
  
  // Transição automática para NEGOCIACAO se estava ABERTO e foi recebido pagamento
  let nextStatus = emprestimoAtual.status
  if (quitado) {
    nextStatus = 'QUITADO'
  } else if (emprestimoAtual.status === 'ABERTO') {
    nextStatus = 'NEGOCIACAO'
  }

  const updated = await prisma.emprestimo.update({
    where: { id: input.emprestimoId },
    data: {
      valorPago: novoValorPago,
      jurosPagos: novoJurosPagos,
      status: nextStatus,
      quitadoEm: quitado ? new Date() : emprestimoAtual.quitadoEm,
    },
  })

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  
  let desc = `Pagamento registrado: ${fmt.format(valor)}.`
  if (pagamentoParaJuros > 0 && pagamentoParaPrincipal > 0) {
    desc += ` (${fmt.format(pagamentoParaJuros)} em juros e ${fmt.format(pagamentoParaPrincipal)} no principal).`
  } else if (pagamentoParaJuros > 0) {
    desc += ` (Total aplicado em juros).`
  } else {
    desc += ` (Total aplicado no principal).`
  }

  const eventoPagamento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao: desc,
      createdById,
      tipo: 'PAGAMENTO'
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

export async function updateLoanUser(loanId: string, newUserId: string) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADM') throw new Error('Apenas administradores podem alterar o responsável.')

  const before = await prisma.emprestimo.findUnique({
    where: { id: loanId },
    select: { usuario: { select: { nome: true } } }
  })

  const updated = await prisma.emprestimo.update({
    where: { id: loanId },
    data: { usuarioId: newUserId },
    include: { usuario: { select: { nome: true } } }
  })

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: loanId,
    acao: 'UPDATE',
    detalhes: `Responsável pelo contrato alterado de ${before?.usuario?.nome || 'Sistema'} para ${updated.usuario?.nome}.`,
    depois: updated
  })

  revalidatePath(`/emprestimos/${loanId}`)
  return updated
}
