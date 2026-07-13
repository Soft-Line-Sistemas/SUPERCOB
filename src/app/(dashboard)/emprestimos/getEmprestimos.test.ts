import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockLogSystemAction,
  mockFindMany,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockLogSystemAction: vi.fn(),
  mockFindMany: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/audit', () => ({ logSystemAction: mockLogSystemAction }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emprestimo: {
      findMany: mockFindMany,
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
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
        id: 'l0',
        status: 'CANCELADO',
        valor: 300,
        cobrancaAtiva: false,
        vencimento: new Date('2026-07-10T12:00:00.000Z'),
        createdAt: new Date('2026-07-06T12:00:00.000Z'),
        cliente: { nome: 'Aline', whatsapp: '71911111111' },
      },
      {
        id: 'l1',
        status: 'ABERTO',
        valor: 1000,
        cobrancaAtiva: true,
        vencimento: new Date('2026-07-20T12:00:00.000Z'),
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
        cliente: { nome: 'Ana', whatsapp: '71999999999' },
      },
      {
        id: 'l2',
        status: 'NEGOCIACAO',
        valor: 2000,
        cobrancaAtiva: true,
        vencimento: new Date('2000-07-10T12:00:00.000Z'),
        createdAt: new Date('2026-07-02T12:00:00.000Z'),
        cliente: { nome: 'Bruno', whatsapp: '71988888888' },
      },
      {
        id: 'l3',
        status: 'QUITADO',
        valor: 1500,
        cobrancaAtiva: true,
        vencimento: new Date('2026-07-03T12:00:00.000Z'),
        createdAt: new Date('2026-07-03T12:00:00.000Z'),
        cliente: { nome: 'Carlos', whatsapp: '71977777777' },
      },
    ])
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
      {
        id: 'l2',
        clienteId: 'c2',
        usuarioId: 'u1',
        valor: 2000,
        quantidadeParcelas: null,
        valorPago: 0,
        jurosMes: 10,
        jurosAtrasoDia: 0,
        vencimento: new Date('2000-07-10T12:00:00.000Z'),
        quitadoEm: null,
        status: 'NEGOCIACAO',
        observacao: null,
        createdAt: new Date('2026-07-02T12:00:00.000Z'),
        cobrancaAtiva: true,
        jurosPagos: 0,
        cliente: { nome: 'Bruno', email: 'bruno@x.com', whatsapp: '71988888888' },
        usuario: { nome: 'Gerente 1' },
        historico: [],
      },
      {
        id: 'l3',
        clienteId: 'c3',
        usuarioId: 'u1',
        valor: 1500,
        quantidadeParcelas: null,
        valorPago: 1500,
        jurosMes: 10,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-03T12:00:00.000Z'),
        quitadoEm: new Date('2026-07-04T12:00:00.000Z'),
        status: 'QUITADO',
        observacao: null,
        createdAt: new Date('2026-07-03T12:00:00.000Z'),
        cobrancaAtiva: true,
        jurosPagos: 0,
        cliente: { nome: 'Carlos', email: 'carlos@x.com', whatsapp: '71977777777' },
        usuario: { nome: 'Gerente 1' },
        historico: [],
      },
    ])

    const result = await getEmprestimos({
      sort: 'az',
      page: 1,
      pageSize: 5,
    })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ cliente: { nome: 'asc' } }, { createdAt: 'desc' }],
        select: expect.objectContaining({
          id: true,
          status: true,
        }),
        where: {
          AND: [{}, { status: { not: 'CANCELADO' } }],
        },
      }),
    )

    expect(mockFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: { in: ['l1', 'l2', 'l3'] } },
      }),
    )

    expect(result).toMatchObject({
      total: 3,
      page: 1,
      pageSize: 5,
      sort: 'az',
      summary: {
        total: 3,
        valorTotal: 4500,
        aberto: 1,
        negociacao: 1,
        quitado: 1,
        cancelado: 0,
        vencidos: 1,
        cobrancaAtiva: 3,
      },
    })
    expect(result.items.map((item) => item.id)).toEqual(['l1', 'l2', 'l3'])
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

  it('aplica filtro de lifecycle fechado no fluxo padrao', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindMany.mockResolvedValueOnce([])

    await getEmprestimos({
      lifecycle: 'closed',
      page: 1,
      pageSize: 10,
    })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ status: { in: ['QUITADO', 'CANCELADO'] } }, { status: { not: 'CANCELADO' } }],
        },
      }),
    )
  })

  it('aplica filtro de vencidos no fluxo especial', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindMany
      .mockResolvedValueOnce([
        {
          id: 'l1',
          status: 'ABERTO',
          valor: 1000,
          cobrancaAtiva: true,
          vencimento: new Date('2000-01-01T12:00:00.000Z'),
          createdAt: new Date('2026-07-05T12:00:00.000Z'),
          cliente: { nome: 'Ana', whatsapp: '71999999999' },
        },
        {
          id: 'l2',
          status: 'ABERTO',
          valor: 500,
          cobrancaAtiva: true,
          vencimento: new Date('2999-01-01T12:00:00.000Z'),
          createdAt: new Date('2026-07-04T12:00:00.000Z'),
          cliente: { nome: 'Bruno', whatsapp: '71988888888' },
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
          vencimento: new Date('2000-01-01T12:00:00.000Z'),
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
      overdue: 'yes',
      page: 1,
      pageSize: 10,
    })

    expect(mockFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: { in: ['l1'] } },
      }),
    )
    expect(result.total).toBe(1)
    expect(result.summary.vencidos).toBe(1)
  })
})
