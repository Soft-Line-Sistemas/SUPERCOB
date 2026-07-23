import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockClienteFindMany,
  mockClienteCount,
  mockClienteDelete,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockClienteFindMany: vi.fn(),
  mockClienteCount: vi.fn(),
  mockClienteDelete: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: mockClienteFindMany,
      count: mockClienteCount,
      findFirst: vi.fn(),
      delete: mockClienteDelete,
    },
  },
}))

import { deleteCliente, getClientesPage } from './actions'

describe('clientes actions - listagem e dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ordena por A-Z e retorna resumo do filtro', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteFindMany
      .mockResolvedValueOnce([
        { id: 'c1', nome: 'Ana', createdAt: new Date('2026-07-01T12:00:00.000Z') },
        { id: 'c2', nome: 'Bruno', createdAt: new Date('2026-07-02T12:00:00.000Z') },
      ])
      .mockResolvedValueOnce([
        { cidade: 'Salvador' },
        { cidade: 'Feira de Santana' },
      ])
    mockClienteCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)

    const result = await getClientesPage({
      page: 2,
      perPage: 2,
      search: 'Ana',
      sort: 'az',
    })

    expect(mockClienteFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 2,
        take: 2,
        orderBy: [{ nome: 'asc' }, { createdAt: 'desc' }],
        where: {
          AND: [
            {
              OR: [
                { nome: { contains: 'Ana' } },
                { email: { contains: 'Ana' } },
                { cidade: { contains: 'Ana' } },
                { estado: { contains: 'Ana' } },
              ],
            },
          ],
        },
      }),
    )

    expect(result).toMatchObject({
      total: 3,
      page: 2,
      perPage: 2,
      totalPages: 2,
      sort: 'az',
      summary: {
        total: 3,
        withEmail: 2,
        withWhatsapp: 3,
        withCpf: 1,
        cities: 2,
      },
    })
  })

  it('mantem filtro de visibilidade do gerente e ordenacao padrao por novos primeiro', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'ger-1', role: 'GERENTE' } })
    mockClienteFindMany
      .mockResolvedValueOnce([{ id: 'c9', nome: 'Cliente X', createdAt: new Date('2026-07-03T12:00:00.000Z') }])
      .mockResolvedValueOnce([{ cidade: 'Salvador' }])
    mockClienteCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)

    await getClientesPage({
      includeIds: ['c-extra'],
      email: 'x@teste.com',
    })

    expect(mockClienteFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }],
        where: {
          AND: [
            {
              OR: [
                { loans: { some: { usuarioId: 'ger-1' } } },
                { id: { in: ['c-extra'] } },
              ],
            },
            { email: { contains: 'x@teste.com' } },
          ],
        },
      }),
    )
  })

  it('aplica filtros de preenchimento dos cards do dashboard', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    mockClienteCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    await getClientesPage({
      emailStatus: 'missing',
      whatsappStatus: 'filled',
      cpfStatus: 'missing',
    })

    expect(mockClienteFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          AND: [
            { OR: [{ email: null }, { email: '' }] },
            { whatsapp: { not: null } },
            { whatsapp: { not: '' } },
            { OR: [{ cpf: null }, { cpf: '' }] },
          ],
        },
      }),
    )
  })

  it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao excluir cliente', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

    await expect(deleteCliente('c1')).resolves.toEqual({
      ok: false,
      error: 'Apenas administradores podem excluir clientes.',
      code: 'FORBIDDEN',
    })
    expect(mockClienteDelete).not.toHaveBeenCalled()
  })

  it.each(['ADM', 'ADMIN'])('permite %s excluir cliente', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role } })
    mockClienteDelete.mockResolvedValue({ id: 'c1' })

    await expect(deleteCliente('c1')).resolves.toEqual({ ok: true, id: 'c1' })
    expect(mockClienteDelete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })
})
