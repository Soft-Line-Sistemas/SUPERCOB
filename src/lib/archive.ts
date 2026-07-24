import { prisma } from '@/lib/prisma'
import { logSystemAction } from '@/lib/audit'
import { assertUniqueClienteCpf, ClientValidationError } from '@/lib/client-validation'

export type ArchiveErrorCode = 'NOT_FOUND' | 'CLIENT_MISSING' | 'DUPLICATE_CPF' | 'INTERNAL_ERROR'

export class ArchiveError extends Error {
  code: ArchiveErrorCode

  constructor(code: ArchiveErrorCode, message: string) {
    super(message)
    this.name = 'ArchiveError'
    this.code = code
  }
}

const TX_OPTIONS = { timeout: 20000, maxWait: 10000 }

export async function resolveClienteLocation(clienteId: string): Promise<'ATIVO' | 'ARQUIVADO' | 'INEXISTENTE'> {
  const [ativo, arquivado] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } }),
    prisma.clienteArquivado.findUnique({ where: { id: clienteId }, select: { id: true } }),
  ])
  if (ativo) return 'ATIVO'
  if (arquivado) return 'ARQUIVADO'
  return 'INEXISTENTE'
}

export async function archiveCliente(clienteId: string, opts: { actorUserId?: string; motivo?: string }) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      documentos: true,
      whatsappPrefs: true,
      loans: { include: { historico: true, whatsappDispatches: true } },
    },
  })
  if (!cliente) throw new ArchiveError('NOT_FOUND', 'Cliente não encontrado.')

  await prisma.$transaction(async (tx) => {
    await tx.clienteArquivado.create({
      data: {
        id: cliente.id,
        nome: cliente.nome,
        indicacao: cliente.indicacao,
        cpf: cliente.cpf,
        rg: cliente.rg,
        orgao: cliente.orgao,
        diaNasc: cliente.diaNasc,
        mesNasc: cliente.mesNasc,
        anoNasc: cliente.anoNasc,
        email: cliente.email,
        whatsapp: cliente.whatsapp,
        instagram: cliente.instagram,
        cep: cliente.cep,
        endereco: cliente.endereco,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        pontoReferencia: cliente.pontoReferencia,
        profissao: cliente.profissao,
        empresa: cliente.empresa,
        cepEmpresa: cliente.cepEmpresa,
        enderecoEmpresa: cliente.enderecoEmpresa,
        cidadeEmpresa: cliente.cidadeEmpresa,
        estadoEmpresa: cliente.estadoEmpresa,
        contatoEmergencia1: cliente.contatoEmergencia1,
        contatoEmergencia2: cliente.contatoEmergencia2,
        contatoEmergencia3: cliente.contatoEmergencia3,
        telefone2: cliente.telefone2,
        observacoes: cliente.observacoes,
        cep2: cliente.cep2,
        endereco2: cliente.endereco2,
        numeroEndereco2: cliente.numeroEndereco2,
        complemento2: cliente.complemento2,
        bairro2: cliente.bairro2,
        cidade2: cliente.cidade2,
        estado2: cliente.estado2,
        pontoReferencia2: cliente.pontoReferencia2,
        numeroEndereco: cliente.numeroEndereco,
        createdAt: cliente.createdAt,
        arquivadoPorId: opts.actorUserId ?? null,
        motivoArquivamento: opts.motivo ?? null,
      },
    })

    if (cliente.documentos.length) {
      await tx.clienteDocumentoArquivado.createMany({
        data: cliente.documentos.map((d) => ({
          id: d.id,
          clienteId: d.clienteId,
          originalName: d.originalName,
          fileName: d.fileName,
          mimeType: d.mimeType,
          size: d.size,
          createdAt: d.createdAt,
        })),
      })
    }

    const whatsappPref = cliente.whatsappPrefs[0]
    if (whatsappPref) {
      await tx.whatsappAutomationClientPreferenceArquivado.create({
        data: {
          id: whatsappPref.id,
          clienteId: whatsappPref.clienteId,
          enabled: whatsappPref.enabled,
          pausedAt: whatsappPref.pausedAt,
          pauseReason: whatsappPref.pauseReason,
          allowRecurrence: whatsappPref.allowRecurrence,
          createdAt: whatsappPref.createdAt,
          updatedAt: whatsappPref.updatedAt,
        },
      })
    }

    for (const loan of cliente.loans) {
      await tx.emprestimoArquivado.create({
        data: {
          id: loan.id,
          clienteId: loan.clienteId,
          usuarioId: loan.usuarioId,
          valor: loan.valor,
          quantidadeParcelas: loan.quantidadeParcelas,
          jurosMes: loan.jurosMes,
          jurosAtrasoDia: loan.jurosAtrasoDia,
          vencimento: loan.vencimento,
          quitadoEm: loan.quitadoEm,
          status: loan.status,
          observacao: loan.observacao,
          arquivo1: loan.arquivo1,
          arquivo2: loan.arquivo2,
          arquivo3: loan.arquivo3,
          arquivo4: loan.arquivo4,
          arquivo5: loan.arquivo5,
          createdAt: loan.createdAt,
          valorPago: loan.valorPago,
          jurosPagos: loan.jurosPagos,
          cobrancaAtiva: loan.cobrancaAtiva,
          inadimplente: loan.inadimplente,
          lastInterestAccrual: loan.lastInterestAccrual,
          arquivadoPorId: opts.actorUserId ?? null,
          motivoArquivamento: opts.motivo ?? null,
          clienteTambemArquivado: true,
        },
      })

      if (loan.historico.length) {
        await tx.emprestimoHistoricoArquivado.createMany({
          data: loan.historico.map((h) => ({
            id: h.id,
            emprestimoId: h.emprestimoId,
            descricao: h.descricao,
            createdAt: h.createdAt,
            createdById: h.createdById,
            tipo: h.tipo,
          })),
        })
      }

      if (loan.whatsappDispatches.length) {
        await tx.whatsappAutomationDispatchArquivado.createMany({
          data: loan.whatsappDispatches.map((d) => ({
            id: d.id,
            ruleId: d.ruleId,
            emprestimoId: d.emprestimoId,
            status: d.status,
            scheduledFor: d.scheduledFor,
            attemptedAt: d.attemptedAt,
            sentAt: d.sentAt,
            errorMessage: d.errorMessage,
            payloadPreview: d.payloadPreview,
            providerRef: d.providerRef,
            triggerMode: d.triggerMode,
            requiresManualFollowUp: d.requiresManualFollowUp,
            followUpStatus: d.followUpStatus,
            followUpResolvedAt: d.followUpResolvedAt,
            followUpNotes: d.followUpNotes,
            createdAt: d.createdAt,
          })),
        })
      }
    }

    // Cascade nas tabelas ativas cuida de loans/historico/dispatches/documentos/whatsappPrefs.
    await tx.cliente.delete({ where: { id: clienteId } })
  }, TX_OPTIONS)

  await logSystemAction({
    entidade: 'CLIENTE',
    entidadeId: clienteId,
    acao: 'ARCHIVE',
    detalhes: opts.motivo,
    antes: cliente,
  })
}

export async function archiveEmprestimo(emprestimoId: string, opts: { actorUserId?: string; motivo?: string }) {
  const loan = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    include: { historico: true, whatsappDispatches: true },
  })
  if (!loan) throw new ArchiveError('NOT_FOUND', 'Contrato não encontrado.')

  await prisma.$transaction(async (tx) => {
    await tx.emprestimoArquivado.create({
      data: {
        id: loan.id,
        clienteId: loan.clienteId,
        usuarioId: loan.usuarioId,
        valor: loan.valor,
        quantidadeParcelas: loan.quantidadeParcelas,
        jurosMes: loan.jurosMes,
        jurosAtrasoDia: loan.jurosAtrasoDia,
        vencimento: loan.vencimento,
        quitadoEm: loan.quitadoEm,
        status: loan.status,
        observacao: loan.observacao,
        arquivo1: loan.arquivo1,
        arquivo2: loan.arquivo2,
        arquivo3: loan.arquivo3,
        arquivo4: loan.arquivo4,
        arquivo5: loan.arquivo5,
        createdAt: loan.createdAt,
        valorPago: loan.valorPago,
        jurosPagos: loan.jurosPagos,
        cobrancaAtiva: loan.cobrancaAtiva,
        inadimplente: loan.inadimplente,
        lastInterestAccrual: loan.lastInterestAccrual,
        arquivadoPorId: opts.actorUserId ?? null,
        motivoArquivamento: opts.motivo ?? null,
        clienteTambemArquivado: false,
      },
    })

    if (loan.historico.length) {
      await tx.emprestimoHistoricoArquivado.createMany({
        data: loan.historico.map((h) => ({
          id: h.id,
          emprestimoId: h.emprestimoId,
          descricao: h.descricao,
          createdAt: h.createdAt,
          createdById: h.createdById,
          tipo: h.tipo,
        })),
      })
    }

    if (loan.whatsappDispatches.length) {
      await tx.whatsappAutomationDispatchArquivado.createMany({
        data: loan.whatsappDispatches.map((d) => ({
          id: d.id,
          ruleId: d.ruleId,
          emprestimoId: d.emprestimoId,
          status: d.status,
          scheduledFor: d.scheduledFor,
          attemptedAt: d.attemptedAt,
          sentAt: d.sentAt,
          errorMessage: d.errorMessage,
          payloadPreview: d.payloadPreview,
          providerRef: d.providerRef,
          triggerMode: d.triggerMode,
          requiresManualFollowUp: d.requiresManualFollowUp,
          followUpStatus: d.followUpStatus,
          followUpResolvedAt: d.followUpResolvedAt,
          followUpNotes: d.followUpNotes,
          createdAt: d.createdAt,
        })),
      })
    }

    await tx.emprestimo.delete({ where: { id: emprestimoId } })
  }, TX_OPTIONS)

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimoId,
    acao: 'ARCHIVE',
    detalhes: opts.motivo,
    antes: loan,
  })
}

export async function unarchiveCliente(clienteId: string, opts: { actorUserId?: string } = {}) {
  const arquivado = await prisma.clienteArquivado.findUnique({
    where: { id: clienteId },
    include: {
      documentos: true,
      whatsappPrefs: true,
    },
  })
  if (!arquivado) throw new ArchiveError('NOT_FOUND', 'Cliente arquivado não encontrado.')

  const loans = await prisma.emprestimoArquivado.findMany({
    where: { clienteId, clienteTambemArquivado: true },
    include: { historico: true, whatsappDispatches: true },
  })

  try {
    await assertUniqueClienteCpf({ cpf: arquivado.cpf })
  } catch (error) {
    if (error instanceof ClientValidationError) {
      throw new ArchiveError('DUPLICATE_CPF', error.message)
    }
    throw error
  }

  await prisma.$transaction(async (tx) => {
    await tx.cliente.create({
      data: {
        id: arquivado.id,
        nome: arquivado.nome,
        indicacao: arquivado.indicacao,
        cpf: arquivado.cpf,
        rg: arquivado.rg,
        orgao: arquivado.orgao,
        diaNasc: arquivado.diaNasc,
        mesNasc: arquivado.mesNasc,
        anoNasc: arquivado.anoNasc,
        email: arquivado.email,
        whatsapp: arquivado.whatsapp,
        instagram: arquivado.instagram,
        cep: arquivado.cep,
        endereco: arquivado.endereco,
        complemento: arquivado.complemento,
        bairro: arquivado.bairro,
        cidade: arquivado.cidade,
        estado: arquivado.estado,
        pontoReferencia: arquivado.pontoReferencia,
        profissao: arquivado.profissao,
        empresa: arquivado.empresa,
        cepEmpresa: arquivado.cepEmpresa,
        enderecoEmpresa: arquivado.enderecoEmpresa,
        cidadeEmpresa: arquivado.cidadeEmpresa,
        estadoEmpresa: arquivado.estadoEmpresa,
        contatoEmergencia1: arquivado.contatoEmergencia1,
        contatoEmergencia2: arquivado.contatoEmergencia2,
        contatoEmergencia3: arquivado.contatoEmergencia3,
        telefone2: arquivado.telefone2,
        observacoes: arquivado.observacoes,
        cep2: arquivado.cep2,
        endereco2: arquivado.endereco2,
        numeroEndereco2: arquivado.numeroEndereco2,
        complemento2: arquivado.complemento2,
        bairro2: arquivado.bairro2,
        cidade2: arquivado.cidade2,
        estado2: arquivado.estado2,
        pontoReferencia2: arquivado.pontoReferencia2,
        numeroEndereco: arquivado.numeroEndereco,
        createdAt: arquivado.createdAt,
      },
    })

    if (arquivado.documentos.length) {
      await tx.clienteDocumento.createMany({
        data: arquivado.documentos.map((d) => ({
          id: d.id,
          clienteId: d.clienteId,
          originalName: d.originalName,
          fileName: d.fileName,
          mimeType: d.mimeType,
          size: d.size,
          createdAt: d.createdAt,
        })),
      })
      await tx.clienteDocumentoArquivado.deleteMany({ where: { clienteId: arquivado.id } })
    }

    if (arquivado.whatsappPrefs) {
      const p = arquivado.whatsappPrefs
      await tx.whatsappAutomationClientPreference.create({
        data: {
          id: p.id,
          clienteId: p.clienteId,
          enabled: p.enabled,
          pausedAt: p.pausedAt,
          pauseReason: p.pauseReason,
          allowRecurrence: p.allowRecurrence,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        },
      })
      await tx.whatsappAutomationClientPreferenceArquivado.delete({ where: { id: p.id } })
    }

    for (const loan of loans) {
      await tx.emprestimo.create({
        data: {
          id: loan.id,
          clienteId: loan.clienteId,
          usuarioId: loan.usuarioId,
          valor: loan.valor,
          quantidadeParcelas: loan.quantidadeParcelas,
          jurosMes: loan.jurosMes,
          jurosAtrasoDia: loan.jurosAtrasoDia,
          vencimento: loan.vencimento,
          quitadoEm: loan.quitadoEm,
          status: loan.status,
          observacao: loan.observacao,
          arquivo1: loan.arquivo1,
          arquivo2: loan.arquivo2,
          arquivo3: loan.arquivo3,
          arquivo4: loan.arquivo4,
          arquivo5: loan.arquivo5,
          createdAt: loan.createdAt,
          valorPago: loan.valorPago,
          jurosPagos: loan.jurosPagos,
          cobrancaAtiva: loan.cobrancaAtiva,
          inadimplente: loan.inadimplente,
          lastInterestAccrual: loan.lastInterestAccrual,
        },
      })

      if (loan.historico.length) {
        await tx.emprestimoHistorico.createMany({
          data: loan.historico.map((h) => ({
            id: h.id,
            emprestimoId: h.emprestimoId,
            descricao: h.descricao,
            createdAt: h.createdAt,
            createdById: h.createdById,
            tipo: h.tipo,
          })),
        })
      }

      if (loan.whatsappDispatches.length) {
        await tx.whatsappAutomationDispatch.createMany({
          data: loan.whatsappDispatches.map((d) => ({
            id: d.id,
            ruleId: d.ruleId,
            emprestimoId: d.emprestimoId,
            status: d.status,
            scheduledFor: d.scheduledFor,
            attemptedAt: d.attemptedAt,
            sentAt: d.sentAt,
            errorMessage: d.errorMessage,
            payloadPreview: d.payloadPreview,
            providerRef: d.providerRef,
            triggerMode: d.triggerMode,
            requiresManualFollowUp: d.requiresManualFollowUp,
            followUpStatus: d.followUpStatus,
            followUpResolvedAt: d.followUpResolvedAt,
            followUpNotes: d.followUpNotes,
            createdAt: d.createdAt,
          })),
        })
      }

      await tx.whatsappAutomationDispatchArquivado.deleteMany({ where: { emprestimoId: loan.id } })
      await tx.emprestimoHistoricoArquivado.deleteMany({ where: { emprestimoId: loan.id } })
      await tx.emprestimoArquivado.delete({ where: { id: loan.id } })
    }

    await tx.clienteArquivado.delete({ where: { id: clienteId } })
  }, TX_OPTIONS)

  await logSystemAction({
    entidade: 'CLIENTE',
    entidadeId: clienteId,
    acao: 'UNARCHIVE',
    depois: { ...arquivado, loans },
  })
}

export async function unarchiveEmprestimo(emprestimoId: string, opts: { actorUserId?: string } = {}) {
  const loan = await prisma.emprestimoArquivado.findUnique({
    where: { id: emprestimoId },
    include: { historico: true, whatsappDispatches: true },
  })
  if (!loan) throw new ArchiveError('NOT_FOUND', 'Contrato arquivado não encontrado.')

  const location = await resolveClienteLocation(loan.clienteId)
  if (location !== 'ATIVO') {
    throw new ArchiveError(
      'CLIENT_MISSING',
      location === 'ARQUIVADO'
        ? 'O cliente deste contrato também está arquivado. Desarquive o cliente primeiro (isso trará o contrato junto).'
        : 'O cliente deste contrato não existe mais. Restauração bloqueada.',
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.emprestimo.create({
      data: {
        id: loan.id,
        clienteId: loan.clienteId,
        usuarioId: loan.usuarioId,
        valor: loan.valor,
        quantidadeParcelas: loan.quantidadeParcelas,
        jurosMes: loan.jurosMes,
        jurosAtrasoDia: loan.jurosAtrasoDia,
        vencimento: loan.vencimento,
        quitadoEm: loan.quitadoEm,
        status: loan.status,
        observacao: loan.observacao,
        arquivo1: loan.arquivo1,
        arquivo2: loan.arquivo2,
        arquivo3: loan.arquivo3,
        arquivo4: loan.arquivo4,
        arquivo5: loan.arquivo5,
        createdAt: loan.createdAt,
        valorPago: loan.valorPago,
        jurosPagos: loan.jurosPagos,
        cobrancaAtiva: loan.cobrancaAtiva,
        inadimplente: loan.inadimplente,
        lastInterestAccrual: loan.lastInterestAccrual,
      },
    })

    if (loan.historico.length) {
      await tx.emprestimoHistorico.createMany({
        data: loan.historico.map((h) => ({
          id: h.id,
          emprestimoId: h.emprestimoId,
          descricao: h.descricao,
          createdAt: h.createdAt,
          createdById: h.createdById,
          tipo: h.tipo,
        })),
      })
    }

    if (loan.whatsappDispatches.length) {
      await tx.whatsappAutomationDispatch.createMany({
        data: loan.whatsappDispatches.map((d) => ({
          id: d.id,
          ruleId: d.ruleId,
          emprestimoId: d.emprestimoId,
          status: d.status,
          scheduledFor: d.scheduledFor,
          attemptedAt: d.attemptedAt,
          sentAt: d.sentAt,
          errorMessage: d.errorMessage,
          payloadPreview: d.payloadPreview,
          providerRef: d.providerRef,
          triggerMode: d.triggerMode,
          requiresManualFollowUp: d.requiresManualFollowUp,
          followUpStatus: d.followUpStatus,
          followUpResolvedAt: d.followUpResolvedAt,
          followUpNotes: d.followUpNotes,
          createdAt: d.createdAt,
        })),
      })
    }

    await tx.whatsappAutomationDispatchArquivado.deleteMany({ where: { emprestimoId: loan.id } })
    await tx.emprestimoHistoricoArquivado.deleteMany({ where: { emprestimoId: loan.id } })
    await tx.emprestimoArquivado.delete({ where: { id: emprestimoId } })
  }, TX_OPTIONS)

  await logSystemAction({
    entidade: 'EMPRESTIMO',
    entidadeId: emprestimoId,
    acao: 'UNARCHIVE',
    depois: loan,
  })
}
