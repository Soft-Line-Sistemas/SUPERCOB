'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logSystemAction } from '@/lib/audit'
import { calculateLoanInterest } from '@/lib/loan-interest'
import { calculateEstimatedMonthlyPayment } from '@/lib/installments'

export async function addEmprestimoHistorico(input: { emprestimoId: string; descricao: string }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const descricao = input.descricao?.trim()
  if (!descricao) throw new Error('Descrição é obrigatória')

  const createdById = (session.user as any).id as string | undefined
  const userRole = (session.user as any).role?.toUpperCase()
  
  // Transição automática de status: ABERTO -> NEGOCIACAO ao registrar histórico (contato feito)
  const currentLoan = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if ((userRole === 'OPERADOR' || userRole === 'GERENTE') && currentLoan?.usuarioId !== createdById) {
    throw new Error('Você só pode registrar ações nos contratos da própria carteira.')
  }
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
  status: 'CANCELADO' | 'QUITADO' | 'ABERTO'
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const userRole = (session.user as any).role?.toUpperCase()
  const createdById = (session.user as any).id as string | undefined

  if (userRole === 'OPERADOR' || userRole === 'GERENTE') {
    const contrato = await prisma.emprestimo.findUnique({
      where: { id: input.emprestimoId },
      select: { usuarioId: true },
    })
    if (contrato?.usuarioId !== createdById) {
      throw new Error('Você só pode alterar contratos da própria carteira.')
    }
  }

  if (input.status === 'ABERTO' && userRole !== 'ADM' && userRole !== 'ADMIN' && userRole !== 'ESCRITORIO') {
    throw new Error('Apenas administradores ou Escritório podem reabrir contratos.')
  }

  if (input.status === 'QUITADO') {
    if (userRole === 'OPERADOR') {
      throw new Error('Apenas administradores, gerentes ou Escritório podem concluir contratos.')
    }
    const atual = await prisma.emprestimo.findUnique({
      where: { id: input.emprestimoId },
      select: {
        valor: true,
        valorPago: true,
        status: true,
        jurosMes: true,
        jurosAtrasoDia: true,
        jurosPagos: true,
        vencimento: true,
        createdAt: true,
      },
    })
    if (!atual) throw new Error('Contrato não encontrado')
    if (atual.status === 'CANCELADO' && userRole !== 'ADM' && userRole !== 'ADMIN') {
      throw new Error('Contrato cancelado não pode ser quitado diretamente sem reabertura.')
    }
    const { principalRestante, jurosPendente } = calculateLoanInterest(atual)
    if (principalRestante > 0 || jurosPendente > 0) {
      throw new Error('Não é possível concluir: ainda existe saldo pendente de principal ou juros')
    }
  }

  const updated = await prisma.emprestimo.update({
    where: { id: input.emprestimoId },
    data: {
      status: input.status,
      quitadoEm: input.status === 'QUITADO' ? new Date() : null,
    },
  })

  const getDesc = () => {
    if (input.status === 'QUITADO') return 'Status alterado para concluído.'
    if (input.status === 'CANCELADO') return 'Status alterado para cancelado.'
    return 'Contrato reaberto pelo administrador.'
  }

  const evento = await prisma.emprestimoHistorico.create({
    data: {
      emprestimoId: input.emprestimoId,
      descricao: getDesc(),
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

export async function addPagamentoParcial(input: {
  emprestimoId: string
  valor: number
  descontoJuros?: number
  renovarCiclo?: boolean
  competenciaVencimento?: string
  jaAbatidoAnteriormente?: boolean
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const valor = Number(input.valor)
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Valor inválido')

  const descontoJuros = Math.max(0, Number(input.descontoJuros) || 0)
  const renovarCiclo = Boolean(input.renovarCiclo)
  const jaAbatidoAnteriormente = Boolean(input.jaAbatidoAnteriormente)

  const createdById = (session.user as any).id as string | undefined
  const userRole = (session.user as any).role?.toUpperCase()

  const emprestimoAtual = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if (!emprestimoAtual) throw new Error('Contrato não encontrado')
  if ((userRole === 'OPERADOR' || userRole === 'GERENTE') && emprestimoAtual.usuarioId !== createdById) {
    throw new Error('Você só pode registrar pagamentos nos contratos da própria carteira.')
  }
  if (emprestimoAtual.status === 'CANCELADO') throw new Error('Contrato cancelado')

  const { jurosPendente } = calculateLoanInterest(emprestimoAtual)

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

  if (quitado && userRole === 'OPERADOR') {
    throw new Error('Este pagamento quitaria o contrato. A conclusão deve ser feita por um administrador, gerente ou Escritório.')
  }
  
  // Transição automática para NEGOCIACAO se estava ABERTO e foi recebido pagamento
  let nextStatus = emprestimoAtual.status
  if (quitado) {
    nextStatus = 'QUITADO'
  } else if (emprestimoAtual.status === 'ABERTO') {
    nextStatus = 'NEGOCIACAO'
  }

  const shouldResetCycle = renovarCiclo || descontoJuros > 0
  let competenciaVencimento: Date | null = null
  if (input.competenciaVencimento) {
    competenciaVencimento = new Date(input.competenciaVencimento)
    if (Number.isNaN(competenciaVencimento.getTime())) throw new Error('Competência inválida')
    if (emprestimoAtual.vencimento && competenciaVencimento.getUTCDate() !== emprestimoAtual.vencimento.getUTCDate()) {
      throw new Error('A competência deve usar o mesmo dia de vencimento do contrato.')
    }
  }
  if (jaAbatidoAnteriormente && !competenciaVencimento) {
    throw new Error('Selecione a competência que já foi abatida anteriormente.')
  }
  if (jaAbatidoAnteriormente && (descontoJuros > 0 || renovarCiclo)) {
    throw new Error('Um registro já abatido não pode aplicar desconto ou renovar o ciclo de juros.')
  }

  const updated = jaAbatidoAnteriormente
    ? emprestimoAtual
    : await prisma.emprestimo.update({
        where: { id: input.emprestimoId },
        data: {
          valorPago: novoValorPago,
          jurosPagos: novoJurosPagos,
          status: nextStatus,
          quitadoEm: quitado ? new Date() : emprestimoAtual.quitadoEm,
          ...(shouldResetCycle
            ? { jurosPagosNoInicioCiclo: novoJurosPagos, jurosCicloIniciadoEm: new Date() }
            : {}),
        },
      })

  if (competenciaVencimento) {
    const valorPrevisto = calculateEstimatedMonthlyPayment({
      valor: emprestimoAtual.valor,
      jurosMes: emprestimoAtual.jurosMes,
      quantidadeParcelas: emprestimoAtual.quantidadeParcelas,
    }) ?? calculateLoanInterest(emprestimoAtual).jurosBase
    const competenciaAtual = await prisma.competenciaEmprestimo.findFirst({
      where: { emprestimoId: input.emprestimoId, vencimento: competenciaVencimento },
    })
    const novoPago = (competenciaAtual?.valorPago ?? 0) + valor
    if (competenciaAtual) {
      await prisma.competenciaEmprestimo.update({
        where: { id: competenciaAtual.id },
        data: { valorPago: novoPago, pagoEm: novoPago + 0.01 >= competenciaAtual.valorPrevisto ? new Date() : competenciaAtual.pagoEm },
      })
    } else {
      await prisma.competenciaEmprestimo.create({
        data: { emprestimoId: input.emprestimoId, vencimento: competenciaVencimento, valorPrevisto, valorPago: valor, pagoEm: valor + 0.01 >= valorPrevisto ? new Date() : null },
      })
    }
  }

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  
  let desc = `Pagamento registrado: ${fmt.format(valor)}.`
  if (competenciaVencimento) desc += ` Referente à competência de ${competenciaVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
  if (jaAbatidoAnteriormente) desc += ' Já abatido anteriormente: somente a competência foi registrada; os totais do contrato não foram alterados.'
  if (descontoJuros > 0) {
    desc += ` Desconto concedido nos juros: ${fmt.format(descontoJuros)}.`
  }
  if (!jaAbatidoAnteriormente && pagamentoParaJuros > 0 && pagamentoParaPrincipal > 0) {
    desc += ` (${fmt.format(pagamentoParaJuros)} em juros e ${fmt.format(pagamentoParaPrincipal)} no principal).`
  } else if (!jaAbatidoAnteriormente && pagamentoParaJuros > 0) {
    desc += ` (Aplicado em juros).`
  } else if (!jaAbatidoAnteriormente) {
    desc += ` (Aplicado no principal).`
  }
  if (!jaAbatidoAnteriormente && shouldResetCycle) {
    desc += ` Ciclo de juros renovado.`
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

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: input.emprestimoId,
    acao: 'PAYMENT',
    detalhes: desc,
    antes: { valorPago: emprestimoAtual.valorPago, jurosPagos: emprestimoAtual.jurosPagos },
    depois: { valorPago: updated.valorPago, jurosPagos: updated.jurosPagos },
  })

  let eventoQuitacao: typeof eventoPagamento | null = null
  if (!jaAbatidoAnteriormente && quitado && emprestimoAtual.status !== 'QUITADO') {
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

export async function vincularPagamentoHistoricoACompetencia(input: {
  emprestimoId: string
  historicoId: string
  competenciaVencimento: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const createdById = (session.user as any).id as string | undefined
  const userRole = (session.user as any).role?.toUpperCase()
  const emprestimo = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if (!emprestimo) throw new Error('Contrato não encontrado')
  if ((userRole === 'OPERADOR' || userRole === 'GERENTE') && emprestimo.usuarioId !== createdById) {
    throw new Error('Você só pode regularizar pagamentos da própria carteira.')
  }

  const recibo = await prisma.emprestimoHistorico.findFirst({
    where: { id: input.historicoId, emprestimoId: input.emprestimoId, tipo: 'PAGAMENTO' },
  })
  if (!recibo) throw new Error('Recibo de pagamento não encontrado')
  if (recibo.competenciaId || /Referente à competência de \d{2}\/\d{2}\/\d{4}/.test(recibo.descricao)) {
    throw new Error('Este pagamento já está vinculado a uma competência.')
  }

  const valorMatch = recibo.descricao.match(/Pagamento registrado:\s*R\$\s*([\d.]+,\d{2})/)
  if (!valorMatch) throw new Error('Não foi possível identificar o valor deste recibo.')
  const valor = Number(valorMatch[1].replace(/\./g, '').replace(',', '.'))
  const vencimento = new Date(input.competenciaVencimento)
  if (!Number.isFinite(valor) || valor <= 0 || Number.isNaN(vencimento.getTime())) throw new Error('Dados de regularização inválidos.')
  if (emprestimo.vencimento && vencimento.getUTCDate() !== emprestimo.vencimento.getUTCDate()) {
    throw new Error('A competência deve usar o mesmo dia de vencimento do contrato.')
  }

  const valorPrevisto = calculateEstimatedMonthlyPayment({
    valor: emprestimo.valor, jurosMes: emprestimo.jurosMes, quantidadeParcelas: emprestimo.quantidadeParcelas,
  }) ?? calculateLoanInterest(emprestimo).jurosBase
  const referencia = vencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const competencia = await prisma.$transaction(async (tx) => {
    let competenciaAtual = await tx.competenciaEmprestimo.findFirst({ where: { emprestimoId: emprestimo.id, vencimento } })
    if (!competenciaAtual) {
      competenciaAtual = await tx.competenciaEmprestimo.create({
        data: { emprestimoId: emprestimo.id, vencimento, valorPrevisto, valorPago: 0 },
      })
    }
    const novoValorPago = competenciaAtual.valorPago + valor
    await tx.competenciaEmprestimo.update({
      where: { id: competenciaAtual.id },
      data: { valorPago: novoValorPago, pagoEm: novoValorPago + 0.01 >= competenciaAtual.valorPrevisto ? recibo.createdAt : competenciaAtual.pagoEm },
    })
    await tx.emprestimoHistorico.update({
      where: { id: recibo.id },
      data: { competenciaId: competenciaAtual.id, descricao: `${recibo.descricao} Regularizado: referente à competência de ${referencia}.` },
    })
    return competenciaAtual
  })
  await logSystemAction({
    entidade: 'EMPRESTIMO', entidadeId: emprestimo.id, acao: 'UPDATE',
    detalhes: `Recibo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)} de ${recibo.createdAt.toLocaleDateString('pt-BR')} vinculado à competência de ${referencia}; sem novo abatimento financeiro.`,
  })
  revalidatePath(`/emprestimos/${emprestimo.id}`)
  return { competenciaId: competencia.id }
}

export async function atualizarVinculoPagamentoHistorico(input: {
  emprestimoId: string
  historicoId: string
  competenciaVencimento?: string | null
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  const createdById = (session.user as any).id as string | undefined
  const userRole = (session.user as any).role?.toUpperCase()
  const emprestimo = await prisma.emprestimo.findUnique({ where: { id: input.emprestimoId } })
  if (!emprestimo) throw new Error('Contrato não encontrado')
  if ((userRole === 'OPERADOR' || userRole === 'GERENTE') && emprestimo.usuarioId !== createdById) throw new Error('Você só pode editar vínculos da própria carteira.')

  const recibo = await prisma.emprestimoHistorico.findFirst({ where: { id: input.historicoId, emprestimoId: input.emprestimoId, tipo: 'PAGAMENTO' } })
  if (!recibo?.competenciaId) throw new Error('Este recibo não possui vínculo regularizado.')
  const valorMatch = recibo.descricao.match(/Pagamento registrado:\s*R\$\s*([\d.]+,\d{2})/)
  const valor = valorMatch ? Number(valorMatch[1].replace(/\./g, '').replace(',', '.')) : 0
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Não foi possível identificar o valor do recibo.')

  let novoVencimento: Date | null = null
  if (input.competenciaVencimento) {
    novoVencimento = new Date(input.competenciaVencimento)
    if (Number.isNaN(novoVencimento.getTime())) throw new Error('Competência inválida.')
    if (emprestimo.vencimento && novoVencimento.getUTCDate() !== emprestimo.vencimento.getUTCDate()) throw new Error('A competência deve usar o mesmo dia de vencimento do contrato.')
  }

  const antigo = await prisma.competenciaEmprestimo.findUnique({ where: { id: recibo.competenciaId } })
  if (!antigo) throw new Error('Competência vinculada não encontrada.')
  const valorPrevisto = calculateEstimatedMonthlyPayment({ valor: emprestimo.valor, jurosMes: emprestimo.jurosMes, quantidadeParcelas: emprestimo.quantidadeParcelas }) ?? calculateLoanInterest(emprestimo).jurosBase
  const descricaoBase = recibo.descricao.replace(/\s*Regularizado: referente à competência de \d{2}\/\d{2}\/\d{4}\./, '')

  await prisma.$transaction(async (tx) => {
    await tx.competenciaEmprestimo.update({
      where: { id: antigo.id },
      data: { valorPago: Math.max(antigo.valorPago - valor, 0), pagoEm: antigo.valorPago - valor + 0.01 >= antigo.valorPrevisto ? antigo.pagoEm : null },
    })
    if (!novoVencimento) {
      await tx.emprestimoHistorico.update({ where: { id: recibo.id }, data: { competenciaId: null, descricao: descricaoBase } })
      return
    }
    let nova = await tx.competenciaEmprestimo.findFirst({ where: { emprestimoId: emprestimo.id, vencimento: novoVencimento } })
    if (!nova) nova = await tx.competenciaEmprestimo.create({ data: { emprestimoId: emprestimo.id, vencimento: novoVencimento, valorPrevisto, valorPago: 0 } })
    const novoPago = nova.valorPago + valor
    await tx.competenciaEmprestimo.update({ where: { id: nova.id }, data: { valorPago: novoPago, pagoEm: novoPago + 0.01 >= nova.valorPrevisto ? recibo.createdAt : nova.pagoEm } })
    const referencia = novoVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    await tx.emprestimoHistorico.update({ where: { id: recibo.id }, data: { competenciaId: nova.id, descricao: `${descricaoBase} Regularizado: referente à competência de ${referencia}.` } })
  })
  await logSystemAction({ entidade: 'EMPRESTIMO', entidadeId: emprestimo.id, acao: 'UPDATE', detalhes: novoVencimento ? 'Vínculo de recibo antigo alterado entre competências; sem novo abatimento financeiro.' : 'Vínculo de recibo antigo removido; sem alteração do saldo geral.' })
  revalidatePath(`/emprestimos/${emprestimo.id}`)
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
