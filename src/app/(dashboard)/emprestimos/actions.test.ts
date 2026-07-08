import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockLogSystemAction,
  mockCreate,
  mockFindUnique,
  mockUpdate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockLogSystemAction: vi.fn(),
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/audit', () => ({ logSystemAction: mockLogSystemAction }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emprestimo: {
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

import { createEmprestimo, updateEmprestimo } from './actions'

describe('emprestimos actions - quantidadeParcelas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })
    mockCreate.mockResolvedValue({ id: 'loan-1' })
    mockFindUnique.mockResolvedValue({ id: 'loan-1', quantidadeParcelas: 12 })
    mockUpdate.mockResolvedValue({ id: 'loan-1' })
    mockLogSystemAction.mockResolvedValue(undefined)
  })

  it('permite criar contrato sem quantidadeParcelas', async () => {
    await expect(
      createEmprestimo({
        clienteId: 'c1',
        valor: 1000,
        jurosMes: 30,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-08T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ id: 'loan-1' })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate.mock.calls[0][0].data).toMatchObject({
      clienteId: 'c1',
      valor: 1000,
    })
    expect(mockCreate.mock.calls[0][0].data).not.toHaveProperty('quantidadeParcelas')
  })

  it('permite criar contrato com quantidadeParcelas válida', async () => {
    await createEmprestimo({
      clienteId: 'c1',
      valor: 1000,
      quantidadeParcelas: 20,
      jurosMes: 30,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeParcelas: 20,
        }),
      }),
    )
  })

  it('permite editar contrato removendo quantidadeParcelas', async () => {
    await expect(
      updateEmprestimo('loan-1', {
        valor: 1000,
        quantidadeParcelas: null,
        jurosMes: 30,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-08T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ id: 'loan-1' })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'loan-1' },
        data: expect.objectContaining({
          quantidadeParcelas: null,
        }),
      }),
    )
  })

  it('rejeita quantidadeParcelas zero ao criar', async () => {
    await expect(
      createEmprestimo({
        clienteId: 'c1',
        valor: 1000,
        quantidadeParcelas: 0,
        jurosMes: 30,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Quantidade de parcelas inválida')

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejeita quantidadeParcelas fracionada ao editar', async () => {
    await expect(
      updateEmprestimo('loan-1', {
        valor: 1000,
        quantidadeParcelas: 2.5,
        jurosMes: 30,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Quantidade de parcelas inválida')

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
