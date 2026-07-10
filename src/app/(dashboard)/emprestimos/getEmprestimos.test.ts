import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockLogSystemAction,
  mockFindMany,
  mockCount,
  mockGroupBy,
  mockAggregate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockLogSystemAction: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockGroupBy: vi.fn(),
  mockAggregate: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/audit', () => ({ logSystemAction: mockLogSystemAction }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emprestimo: {
      findMany: mockFindMany,
      count: mockCount,
      groupBy: mockGroupBy,
      aggregate: mockAggregate,
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getEmprestimos } from './actions'

describe('emprestimos actions - ordenacao e dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ordena por A-Z e consolida dashboard no fluxo padrao', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'l1',
        clienteId: 'c1',
        usuarioId: 'u1',
        valor: 1000,
        quantidadeParcelas: null,
        valorPago: 0,
        jurosMes: 10,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-20T12:00:00.000Z'),
        quitadoEm: null,
        status: 'ABERTO',
        observacao: null,
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
        cobrancaAtiva: true,
        jurosPagos: 0,
        cliente: { nome: 'Ana', email: 'ana@x.com', whatsapp: '71999999999' },
        usuario: { nome: 'Gerente 1' },
        historico: [],
      },
    ])
    mockCount
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
    mockGroupBy.mockResolvedValue([
      { status: 'ABERTO', _count: { _all: 2 } },
      { status: 'NEGOCIACAO', _count: { _all: 1 } },
      { status: 'QUITADO', _count: { _all: 1 } },
    ])
    mockAggregate.mockResolvedValue({ _sum: { valor: 4500 } })

    const result = await getEmprestimos({
      sort: 'az',
      status: 'ABERTO',
      page: 2,
      pageSize: 5,
    })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: [{ cliente: { nome: 'asc' } }, { createdAt: 'desc' }],
        where: { status: 'ABERTO' },
      }),
    )

    expect(result).toMatchObject({
      total: 4,
      page: 2,
      pageSize: 5,
      sort: 'az',
      summary: {
        total: 4,
        valorTotal: 4500,
        aberto: 2,
        negociacao: 1,
        quitado: 1,
        cancelado: 0,
        vencidos: 2,
        cobrancaAtiva: 3,
      },
    })
  })

  it('gera dashboard a partir dos candidatos filtrados quando usa contactOnly', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindMany
      .mockResolvedValueOnce([
        {
          id: 'l1',
          status: 'ABERTO',
          valor: 1000,
          cobrancaAtiva: true,
          vencimento: new Date('2000-07-01T12:00:00.000Z'),
          createdAt: new Date('2026-07-05T12:00:00.000Z'),
          cliente: { nome: 'Ana', whatsapp: '71999999999' },
        },
        {
          id: 'l2',
          status: 'QUITADO',
          valor: 800,
          cobrancaAtiva: true,
          vencimento: new Date('2026-07-02T12:00:00.000Z'),
          createdAt: new Date('2026-07-04T12:00:00.000Z'),
          cliente: { nome: 'Bruno', whatsapp: '71988888888' },
        },
        {
          id: 'l3',
          status: 'NEGOCIACAO',
          valor: 600,
          cobrancaAtiva: false,
          vencimento: new Date('2999-08-10T12:00:00.000Z'),
          createdAt: new Date('2026-07-03T12:00:00.000Z'),
          cliente: { nome: 'Carlos', whatsapp: '71977777777' },
        },
        {
          id: 'l4',
          status: 'ABERTO',
          valor: 400,
          cobrancaAtiva: true,
          vencimento: new Date('2026-07-06T12:00:00.000Z'),
          createdAt: new Date('2026-07-02T12:00:00.000Z'),
          cliente: { nome: 'Dora', whatsapp: '123' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'l1',
          clienteId: 'c1',
          usuarioId: 'u1',
          valor: 1000,
          quantidadeParcelas: null,
          valorPago: 0,
          jurosMes: 10,
          jurosAtrasoDia: 0,
          vencimento: new Date('2000-07-01T12:00:00.000Z'),
          quitadoEm: null,
          status: 'ABERTO',
          observacao: null,
          createdAt: new Date('2026-07-05T12:00:00.000Z'),
          cobrancaAtiva: true,
          jurosPagos: 0,
          cliente: { nome: 'Ana', email: 'ana@x.com', whatsapp: '71999999999' },
          usuario: { nome: 'Gerente 1' },
          historico: [],
        },
      ])

    const result = await getEmprestimos({
      contactOnly: true,
      page: 1,
      pageSize: 1,
    })

    expect(mockFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }],
      }),
    )
    expect(mockFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: { in: ['l1'] } },
      }),
    )

    expect(result).toMatchObject({
      total: 2,
      summary: {
        total: 2,
        valorTotal: 1600,
        aberto: 1,
        negociacao: 1,
        quitado: 0,
        cancelado: 0,
        cobrancaAtiva: 1,
      },
    })
    expect(result.summary.vencidos).toBeGreaterThanOrEqual(1)
    expect(result.items.map((item) => item.id)).toEqual(['l1'])
  })
})
