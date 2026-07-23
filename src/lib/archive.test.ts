import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockLogSystemAction,
  mockAssertUniqueClienteCpf,
  mockClienteFindUnique,
  mockClienteDelete,
  mockClienteCreate,
  mockClienteArquivadoFindUnique,
  mockClienteArquivadoCreate,
  mockClienteArquivadoDelete,
  mockClienteDocumentoCreateMany,
  mockClienteDocumentoArquivadoCreateMany,
  mockClienteDocumentoArquivadoDeleteMany,
  mockWhatsappPrefCreate,
  mockWhatsappPrefArquivadoCreate,
  mockWhatsappPrefArquivadoDelete,
  mockEmprestimoFindUnique,
  mockEmprestimoDelete,
  mockEmprestimoCreate,
  mockEmprestimoArquivadoFindUnique,
  mockEmprestimoArquivadoFindMany,
  mockEmprestimoArquivadoCreate,
  mockEmprestimoArquivadoDelete,
  mockEmprestimoHistoricoCreateMany,
  mockEmprestimoHistoricoArquivadoCreateMany,
  mockEmprestimoHistoricoArquivadoDeleteMany,
  mockDispatchCreateMany,
  mockDispatchArquivadoCreateMany,
  mockDispatchArquivadoDeleteMany,
  mockTransaction,
  prismaMock,
} = vi.hoisted(() => {
  const mockLogSystemAction = vi.fn()
  const mockAssertUniqueClienteCpf = vi.fn()
  const mockClienteFindUnique = vi.fn()
  const mockClienteDelete = vi.fn()
  const mockClienteCreate = vi.fn()
  const mockClienteArquivadoFindUnique = vi.fn()
  const mockClienteArquivadoCreate = vi.fn()
  const mockClienteArquivadoDelete = vi.fn()
  const mockClienteDocumentoCreateMany = vi.fn()
  const mockClienteDocumentoArquivadoCreateMany = vi.fn()
  const mockClienteDocumentoArquivadoDeleteMany = vi.fn()
  const mockWhatsappPrefCreate = vi.fn()
  const mockWhatsappPrefArquivadoCreate = vi.fn()
  const mockWhatsappPrefArquivadoDelete = vi.fn()
  const mockEmprestimoFindUnique = vi.fn()
  const mockEmprestimoDelete = vi.fn()
  const mockEmprestimoCreate = vi.fn()
  const mockEmprestimoArquivadoFindUnique = vi.fn()
  const mockEmprestimoArquivadoFindMany = vi.fn()
  const mockEmprestimoArquivadoCreate = vi.fn()
  const mockEmprestimoArquivadoDelete = vi.fn()
  const mockEmprestimoHistoricoCreateMany = vi.fn()
  const mockEmprestimoHistoricoArquivadoCreateMany = vi.fn()
  const mockEmprestimoHistoricoArquivadoDeleteMany = vi.fn()
  const mockDispatchCreateMany = vi.fn()
  const mockDispatchArquivadoCreateMany = vi.fn()
  const mockDispatchArquivadoDeleteMany = vi.fn()
  const mockTransaction = vi.fn()

  const prismaMock = {
    cliente: {
      findUnique: mockClienteFindUnique,
      delete: mockClienteDelete,
      create: mockClienteCreate,
    },
    clienteArquivado: {
      findUnique: mockClienteArquivadoFindUnique,
      create: mockClienteArquivadoCreate,
      delete: mockClienteArquivadoDelete,
    },
    clienteDocumento: {
      createMany: mockClienteDocumentoCreateMany,
    },
    clienteDocumentoArquivado: {
      createMany: mockClienteDocumentoArquivadoCreateMany,
      deleteMany: mockClienteDocumentoArquivadoDeleteMany,
    },
    whatsappAutomationClientPreference: {
      create: mockWhatsappPrefCreate,
    },
    whatsappAutomationClientPreferenceArquivado: {
      create: mockWhatsappPrefArquivadoCreate,
      delete: mockWhatsappPrefArquivadoDelete,
    },
    emprestimo: {
      findUnique: mockEmprestimoFindUnique,
      delete: mockEmprestimoDelete,
      create: mockEmprestimoCreate,
    },
    emprestimoArquivado: {
      findUnique: mockEmprestimoArquivadoFindUnique,
      findMany: mockEmprestimoArquivadoFindMany,
      create: mockEmprestimoArquivadoCreate,
      delete: mockEmprestimoArquivadoDelete,
    },
    emprestimoHistorico: {
      createMany: mockEmprestimoHistoricoCreateMany,
    },
    emprestimoHistoricoArquivado: {
      createMany: mockEmprestimoHistoricoArquivadoCreateMany,
      deleteMany: mockEmprestimoHistoricoArquivadoDeleteMany,
    },
    whatsappAutomationDispatch: {
      createMany: mockDispatchCreateMany,
    },
    whatsappAutomationDispatchArquivado: {
      createMany: mockDispatchArquivadoCreateMany,
      deleteMany: mockDispatchArquivadoDeleteMany,
    },
    $transaction: mockTransaction,
  }

  return {
    mockLogSystemAction,
    mockAssertUniqueClienteCpf,
    mockClienteFindUnique,
    mockClienteDelete,
    mockClienteCreate,
    mockClienteArquivadoFindUnique,
    mockClienteArquivadoCreate,
    mockClienteArquivadoDelete,
    mockClienteDocumentoCreateMany,
    mockClienteDocumentoArquivadoCreateMany,
    mockClienteDocumentoArquivadoDeleteMany,
    mockWhatsappPrefCreate,
    mockWhatsappPrefArquivadoCreate,
    mockWhatsappPrefArquivadoDelete,
    mockEmprestimoFindUnique,
    mockEmprestimoDelete,
    mockEmprestimoCreate,
    mockEmprestimoArquivadoFindUnique,
    mockEmprestimoArquivadoFindMany,
    mockEmprestimoArquivadoCreate,
    mockEmprestimoArquivadoDelete,
    mockEmprestimoHistoricoCreateMany,
    mockEmprestimoHistoricoArquivadoCreateMany,
    mockEmprestimoHistoricoArquivadoDeleteMany,
    mockDispatchCreateMany,
    mockDispatchArquivadoCreateMany,
    mockDispatchArquivadoDeleteMany,
    mockTransaction,
    prismaMock,
  }
})

vi.mock('@/lib/audit', () => ({ logSystemAction: mockLogSystemAction }))
vi.mock('@/lib/client-validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client-validation')>()
  return {
    ...actual,
    assertUniqueClienteCpf: mockAssertUniqueClienteCpf,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  archiveCliente,
  archiveEmprestimo,
  ArchiveError,
  resolveClienteLocation,
  unarchiveCliente,
  unarchiveEmprestimo,
} from './archive'

const baseCliente = {
  id: 'cli-1',
  nome: 'Ana Souza',
  indicacao: null,
  cpf: '52998224725',
  rg: null,
  orgao: null,
  diaNasc: null,
  mesNasc: null,
  anoNasc: null,
  email: null,
  whatsapp: '71999998888',
  instagram: null,
  cep: null,
  endereco: null,
  complemento: null,
  bairro: null,
  cidade: null,
  estado: null,
  pontoReferencia: null,
  profissao: null,
  empresa: null,
  cepEmpresa: null,
  enderecoEmpresa: null,
  cidadeEmpresa: null,
  estadoEmpresa: null,
  contatoEmergencia1: null,
  contatoEmergencia2: null,
  contatoEmergencia3: null,
  telefone2: null,
  observacoes: null,
  cep2: null,
  endereco2: null,
  numeroEndereco2: null,
  complemento2: null,
  bairro2: null,
  cidade2: null,
  estado2: null,
  pontoReferencia2: null,
  numeroEndereco: null,
  createdAt: new Date('2026-01-01T12:00:00.000Z'),
  documentos: [] as any[],
  whatsappPrefs: [] as any[],
  loans: [] as any[],
}

const baseLoan = {
  id: 'loan-1',
  clienteId: 'cli-1',
  usuarioId: 'user-1',
  valor: 1000,
  quantidadeParcelas: 3,
  jurosMes: 5,
  jurosAtrasoDia: 1,
  vencimento: new Date('2026-08-01T12:00:00.000Z'),
  quitadoEm: null,
  status: 'ABERTO',
  observacao: null,
  arquivo1: null,
  arquivo2: null,
  arquivo3: null,
  arquivo4: null,
  arquivo5: null,
  createdAt: new Date('2026-01-05T12:00:00.000Z'),
  valorPago: 0,
  jurosPagos: 0,
  cobrancaAtiva: true,
  lastInterestAccrual: null,
  historico: [] as any[],
  whatsappDispatches: [] as any[],
}

describe('archive.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // $transaction executa o callback recebendo o mesmo objeto prisma mockado como "tx"
    mockTransaction.mockImplementation(async (callback: any) => callback(prismaMock))
    mockAssertUniqueClienteCpf.mockResolvedValue(undefined)
  })

  describe('resolveClienteLocation', () => {
    it('retorna ATIVO quando o cliente existe na tabela ativa', async () => {
      mockClienteFindUnique.mockResolvedValue({ id: 'cli-1' })
      mockClienteArquivadoFindUnique.mockResolvedValue(null)

      await expect(resolveClienteLocation('cli-1')).resolves.toBe('ATIVO')
    })

    it('retorna ARQUIVADO quando só existe na tabela de arquivo', async () => {
      mockClienteFindUnique.mockResolvedValue(null)
      mockClienteArquivadoFindUnique.mockResolvedValue({ id: 'cli-1' })

      await expect(resolveClienteLocation('cli-1')).resolves.toBe('ARQUIVADO')
    })

    it('retorna INEXISTENTE quando não existe em nenhuma tabela', async () => {
      mockClienteFindUnique.mockResolvedValue(null)
      mockClienteArquivadoFindUnique.mockResolvedValue(null)

      await expect(resolveClienteLocation('cli-1')).resolves.toBe('INEXISTENTE')
    })
  })

  describe('archiveCliente', () => {
    it('lança NOT_FOUND quando o cliente não existe', async () => {
      mockClienteFindUnique.mockResolvedValue(null)

      await expect(archiveCliente('cli-1', {})).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'NOT_FOUND',
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('copia cliente, documentos, preferência whatsapp e contratos (com histórico e dispatches) para as tabelas de arquivo, depois apaga o cliente ativo', async () => {
      const cliente = {
        ...baseCliente,
        documentos: [
          { id: 'doc-1', clienteId: 'cli-1', originalName: 'rg.pdf', fileName: 'f1.pdf', mimeType: 'application/pdf', size: 123, createdAt: new Date('2026-01-02T12:00:00.000Z') },
        ],
        whatsappPrefs: [
          { id: 'pref-1', clienteId: 'cli-1', enabled: true, pausedAt: null, pauseReason: null, allowRecurrence: true, createdAt: new Date('2026-01-01T12:00:00.000Z'), updatedAt: new Date('2026-01-01T12:00:00.000Z') },
        ],
        loans: [
          {
            ...baseLoan,
            historico: [{ id: 'hist-1', emprestimoId: 'loan-1', descricao: 'Criado', createdAt: new Date(), createdById: 'user-1', tipo: 'CREATE' }],
            whatsappDispatches: [{ id: 'disp-1', ruleId: 'rule-1', emprestimoId: 'loan-1', status: 'SENT', scheduledFor: null, attemptedAt: null, sentAt: null, errorMessage: null, payloadPreview: null, providerRef: null, triggerMode: 'AUTO', requiresManualFollowUp: false, followUpStatus: 'NONE', followUpResolvedAt: null, followUpNotes: null, createdAt: new Date() }],
          },
        ],
      }
      mockClienteFindUnique.mockResolvedValue(cliente)

      await archiveCliente('cli-1', { actorUserId: 'admin-1', motivo: 'Encerramento' })

      expect(mockClienteArquivadoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'cli-1',
            nome: 'Ana Souza',
            arquivadoPorId: 'admin-1',
            motivoArquivamento: 'Encerramento',
          }),
        }),
      )
      expect(mockClienteDocumentoArquivadoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'doc-1', fileName: 'f1.pdf' })],
      })
      expect(mockWhatsappPrefArquivadoCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'pref-1', clienteId: 'cli-1' }),
      })
      expect(mockEmprestimoArquivadoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'loan-1', clienteTambemArquivado: true }),
        }),
      )
      expect(mockEmprestimoHistoricoArquivadoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'hist-1' })],
      })
      expect(mockDispatchArquivadoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'disp-1' })],
      })
      expect(mockClienteDelete).toHaveBeenCalledWith({ where: { id: 'cli-1' } })
      expect(mockLogSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({ entidade: 'CLIENTE', entidadeId: 'cli-1', acao: 'ARCHIVE', detalhes: 'Encerramento' }),
      )
    })

    it('não cria linhas filhas quando não há documentos, preferência ou contratos', async () => {
      mockClienteFindUnique.mockResolvedValue({ ...baseCliente })

      await archiveCliente('cli-1', {})

      expect(mockClienteDocumentoArquivadoCreateMany).not.toHaveBeenCalled()
      expect(mockWhatsappPrefArquivadoCreate).not.toHaveBeenCalled()
      expect(mockEmprestimoArquivadoCreate).not.toHaveBeenCalled()
      expect(mockClienteDelete).toHaveBeenCalledWith({ where: { id: 'cli-1' } })
    })
  })

  describe('archiveEmprestimo', () => {
    it('lança NOT_FOUND quando o contrato não existe', async () => {
      mockEmprestimoFindUnique.mockResolvedValue(null)

      await expect(archiveEmprestimo('loan-1', {})).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'NOT_FOUND',
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('arquiva só o contrato (clienteTambemArquivado: false) sem tocar no cliente', async () => {
      mockEmprestimoFindUnique.mockResolvedValue({ ...baseLoan })

      await archiveEmprestimo('loan-1', { actorUserId: 'admin-1', motivo: 'Quitado há muito tempo' })

      expect(mockEmprestimoArquivadoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'loan-1', clienteTambemArquivado: false, motivoArquivamento: 'Quitado há muito tempo' }),
        }),
      )
      expect(mockEmprestimoDelete).toHaveBeenCalledWith({ where: { id: 'loan-1' } })
      expect(mockClienteDelete).not.toHaveBeenCalled()
      expect(mockLogSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({ entidade: 'EMPRESTIMO', entidadeId: 'loan-1', acao: 'ARCHIVE' }),
      )
    })
  })

  describe('unarchiveCliente', () => {
    it('lança NOT_FOUND quando o cliente arquivado não existe', async () => {
      mockClienteArquivadoFindUnique.mockResolvedValue(null)

      await expect(unarchiveCliente('cli-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'NOT_FOUND',
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('bloqueia com DUPLICATE_CPF quando já existe cliente ativo com o mesmo CPF', async () => {
      mockClienteArquivadoFindUnique.mockResolvedValue({ ...baseCliente, documentos: [], whatsappPrefs: null })
      mockEmprestimoArquivadoFindMany.mockResolvedValue([])

      const { ClientValidationError } = await import('./client-validation')
      mockAssertUniqueClienteCpf.mockRejectedValue(new ClientValidationError('DUPLICATE_CPF', 'Já existe um cliente cadastrado com esse CPF: Ana Souza.'))

      await expect(unarchiveCliente('cli-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'DUPLICATE_CPF',
        message: 'Já existe um cliente cadastrado com esse CPF: Ana Souza.',
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('restaura cliente, documentos, preferência whatsapp e contratos arquivados junto, removendo tudo do arquivo', async () => {
      const arquivado = {
        ...baseCliente,
        documentos: [
          { id: 'doc-1', clienteId: 'cli-1', originalName: 'rg.pdf', fileName: 'f1.pdf', mimeType: 'application/pdf', size: 123, createdAt: new Date() },
        ],
        whatsappPrefs: { id: 'pref-1', clienteId: 'cli-1', enabled: true, pausedAt: null, pauseReason: null, allowRecurrence: true, createdAt: new Date(), updatedAt: new Date() },
      }
      mockClienteArquivadoFindUnique.mockResolvedValue(arquivado)
      mockEmprestimoArquivadoFindMany.mockResolvedValue([
        {
          ...baseLoan,
          historico: [{ id: 'hist-1', emprestimoId: 'loan-1', descricao: 'Criado', createdAt: new Date(), createdById: 'user-1', tipo: 'CREATE' }],
          whatsappDispatches: [],
        },
      ])

      await unarchiveCliente('cli-1', { actorUserId: 'admin-1' })

      expect(mockEmprestimoArquivadoFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clienteId: 'cli-1', clienteTambemArquivado: true } }),
      )
      expect(mockClienteCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'cli-1', nome: 'Ana Souza' }) }),
      )
      expect(mockClienteDocumentoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'doc-1' })],
      })
      expect(mockClienteDocumentoArquivadoDeleteMany).toHaveBeenCalledWith({ where: { clienteId: 'cli-1' } })
      expect(mockWhatsappPrefCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'pref-1' }),
      })
      expect(mockWhatsappPrefArquivadoDelete).toHaveBeenCalledWith({ where: { id: 'pref-1' } })
      expect(mockEmprestimoCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'loan-1' }) }),
      )
      expect(mockEmprestimoHistoricoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'hist-1' })],
      })
      expect(mockEmprestimoArquivadoDelete).toHaveBeenCalledWith({ where: { id: 'loan-1' } })
      expect(mockClienteArquivadoDelete).toHaveBeenCalledWith({ where: { id: 'cli-1' } })
      expect(mockLogSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({ entidade: 'CLIENTE', entidadeId: 'cli-1', acao: 'UNARCHIVE' }),
      )
    })
  })

  describe('unarchiveEmprestimo', () => {
    it('lança NOT_FOUND quando o contrato arquivado não existe', async () => {
      mockEmprestimoArquivadoFindUnique.mockResolvedValue(null)

      await expect(unarchiveEmprestimo('loan-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'NOT_FOUND',
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('bloqueia com CLIENT_MISSING quando o cliente também está arquivado', async () => {
      mockEmprestimoArquivadoFindUnique.mockResolvedValue({ ...baseLoan })
      mockClienteFindUnique.mockResolvedValue(null)
      mockClienteArquivadoFindUnique.mockResolvedValue({ id: 'cli-1' })

      await expect(unarchiveEmprestimo('loan-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'CLIENT_MISSING',
        message: expect.stringContaining('Desarquive o cliente primeiro'),
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('bloqueia com CLIENT_MISSING quando o cliente não existe em nenhuma tabela', async () => {
      mockEmprestimoArquivadoFindUnique.mockResolvedValue({ ...baseLoan })
      mockClienteFindUnique.mockResolvedValue(null)
      mockClienteArquivadoFindUnique.mockResolvedValue(null)

      await expect(unarchiveEmprestimo('loan-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'CLIENT_MISSING',
        message: expect.stringContaining('não existe mais'),
      })
    })

    it('restaura o contrato quando o cliente está ativo', async () => {
      mockEmprestimoArquivadoFindUnique.mockResolvedValue({
        ...baseLoan,
        historico: [{ id: 'hist-1', emprestimoId: 'loan-1', descricao: 'Criado', createdAt: new Date(), createdById: 'user-1', tipo: 'CREATE' }],
        whatsappDispatches: [],
      })
      mockClienteFindUnique.mockResolvedValue({ id: 'cli-1' })
      mockClienteArquivadoFindUnique.mockResolvedValue(null)

      await unarchiveEmprestimo('loan-1', { actorUserId: 'admin-1' })

      expect(mockEmprestimoCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'loan-1', clienteId: 'cli-1' }) }),
      )
      expect(mockEmprestimoHistoricoCreateMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ id: 'hist-1' })],
      })
      expect(mockEmprestimoArquivadoDelete).toHaveBeenCalledWith({ where: { id: 'loan-1' } })
      expect(mockLogSystemAction).toHaveBeenCalledWith(
        expect.objectContaining({ entidade: 'EMPRESTIMO', entidadeId: 'loan-1', acao: 'UNARCHIVE' }),
      )
    })
  })

  describe('ArchiveError', () => {
    it('carrega code e message corretamente', () => {
      const error = new ArchiveError('NOT_FOUND', 'não encontrado')
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('ArchiveError')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('não encontrado')
    })
  })
})
