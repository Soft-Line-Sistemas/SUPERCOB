import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockFindUnique,
  mockUpdate,
  mockHistoricoCreate,
  mockRevalidatePath,
  mockCalculateLoanInterest,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockHistoricoCreate: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockCalculateLoanInterest: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/audit', () => ({ logSystemAction: vi.fn() }))
vi.mock('@/lib/loan-interest', () => ({ calculateLoanInterest: mockCalculateLoanInterest }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emprestimo: { findUnique: mockFindUnique, update: mockUpdate },
    emprestimoHistorico: { create: mockHistoricoCreate },
  },
}))

import { addEmprestimoHistorico, addPagamentoParcial, setEmprestimoStatus } from './actions'

const contract = {
  id: 'loan-1',
  usuarioId: 'op-1',
  valor: 100,
  valorPago: 0,
  jurosMes: 0,
  jurosAtrasoDia: 0,
  jurosPagos: 0,
  vencimento: new Date('2026-07-08T12:00:00.000Z'),
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
  status: 'ABERTO',
}

describe('detalhe do contrato - bloqueios por perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(contract)
    mockUpdate.mockResolvedValue({ ...contract, status: 'QUITADO' })
    mockHistoricoCreate.mockResolvedValue({ id: 'event-1' })
    mockCalculateLoanInterest.mockReturnValue({ principalRestante: 0, jurosPendente: 0 })
  })

  it.each(['ESCRITORIO', 'OPERADOR'])('bloqueia %s ao concluir o contrato', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: role === 'OPERADOR' ? 'op-1' : 'esc-1', role } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' }))
      .rejects.toThrow('Apenas administradores ou gerentes podem concluir contratos.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each(['ADM', 'ADMIN', 'GERENTE'])('permite %s concluir contrato sem saldo pendente', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: role === 'GERENTE' ? 'op-1' : 'u1', role } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' })).resolves.toBeTruthy()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'loan-1' },
      data: expect.objectContaining({ status: 'QUITADO' }),
    }))
  })

  it.each(['ESCRITORIO', 'OPERADOR'])('bloqueia %s ao registrar pagamento que quitaria o contrato', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: role === 'OPERADOR' ? 'op-1' : 'esc-1', role } })

    await expect(addPagamentoParcial({ emprestimoId: 'loan-1', valor: 100 }))
      .rejects.toThrow('Este pagamento quitaria o contrato.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('bloqueia Operador em contrato de outra carteira', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'op-2', role: 'OPERADOR' } })

    await expect(addEmprestimoHistorico({ emprestimoId: 'loan-1', descricao: 'Contato realizado' }))
      .rejects.toThrow('Você só pode registrar ações nos contratos da própria carteira.')
    await expect(addPagamentoParcial({ emprestimoId: 'loan-1', valor: 10 }))
      .rejects.toThrow('Você só pode registrar pagamentos nos contratos da própria carteira.')
  })

  it('bloqueia Gerente ao concluir contrato de outra carteira', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'ger-2', role: 'GERENTE' } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' }))
      .rejects.toThrow('Você só pode alterar contratos da própria carteira.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
