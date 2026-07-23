import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockLogSystemAction,
  mockCreate,
  mockFindUnique,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockLogSystemAction: vi.fn(),
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
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
      delete: mockDelete,
    },
  },
}))

import { createEmprestimo, deleteEmprestimo, updateEmprestimo } from './actions'

describe('emprestimos actions - quantidadeParcelas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })
    mockCreate.mockResolvedValue({ id: 'loan-1' })
    mockFindUnique.mockResolvedValue({ id: 'loan-1', quantidadeParcelas: 12, usuarioId: 'u1' })
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
      quantidadeParcelas: undefined,
    })
  })

  it('permite criar contrato com quantidadeParcelas válida', async () => {
    await createEmprestimo({
      clienteId: 'c1',
      valor: 1000,
      valorPago: 500,
      quantidadeParcelas: 20,
      jurosMes: 30,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorPago: 500,
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

  it('rejeita valorPago maior que o valor do contrato', async () => {
    await expect(
      createEmprestimo({
        clienteId: 'c1',
        valor: 1000,
        valorPago: 1200,
        quantidadeParcelas: 10,
        jurosMes: 30,
        jurosAtrasoDia: 0,
        vencimento: new Date('2026-07-08T12:00:00.000Z'),
      }),
    ).rejects.toThrow('Valor pago inválido para a cobrança')

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('bloqueia Operador ao criar ou editar contratos', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'op-1', role: 'OPERADOR' } })

    await expect(createEmprestimo({
      clienteId: 'c1', valor: 1000, vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })).rejects.toThrow('Operadores não podem criar contratos.')

    await expect(updateEmprestimo('loan-1', {
      valor: 1000, vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })).rejects.toThrow('Operadores não podem editar contratos.')
  })

  it('bloqueia Escritório ao criar ou editar um contrato já quitado', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })

    await expect(createEmprestimo({
      clienteId: 'c1', valor: 1000, valorPago: 1000, vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })).rejects.toThrow('Apenas administradores ou gerentes podem concluir contratos.')

    await expect(updateEmprestimo('loan-1', {
      valor: 1000, valorPago: 1000, vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })).rejects.toThrow('Apenas administradores ou gerentes podem concluir contratos.')
  })

  it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao excluir contratos', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

    await expect(deleteEmprestimo('loan-1')).rejects.toThrow('Apenas administradores podem excluir contratos.')
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it.each(['ADM', 'ADMIN'])('permite %s excluir contratos', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role } })
    mockDelete.mockResolvedValue({ id: 'loan-1' })

    await expect(deleteEmprestimo('loan-1')).resolves.toBeUndefined()
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'loan-1' } })
  })

  it('bloqueia Gerente ao editar contrato de outra carteira', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'ger-1', role: 'GERENTE' } })
    mockFindUnique.mockResolvedValue({ id: 'loan-1', usuarioId: 'ger-2' })

    await expect(updateEmprestimo('loan-1', {
      valor: 1000, vencimento: new Date('2026-07-08T12:00:00.000Z'),
    })).rejects.toThrow('Gerentes só podem editar contratos da própria carteira.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
