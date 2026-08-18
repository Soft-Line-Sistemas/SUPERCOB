import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockFindUnique,
  mockUpdate,
  mockHistoricoCreate,
  mockCompetenciaFindFirst,
  mockCompetenciaCreate,
  mockRevalidatePath,
  mockCalculateLoanInterest,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockHistoricoCreate: vi.fn(),
  mockCompetenciaFindFirst: vi.fn(),
  mockCompetenciaCreate: vi.fn(),
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
    competenciaEmprestimo: { findFirst: mockCompetenciaFindFirst, create: mockCompetenciaCreate },
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
    mockCompetenciaFindFirst.mockResolvedValue(null)
    mockCompetenciaCreate.mockResolvedValue({ id: 'competencia-1' })
    mockCalculateLoanInterest.mockReturnValue({ principalRestante: 0, jurosPendente: 0 })
  })

  it('bloqueia Operador ao concluir o contrato', async () => {
    const role = 'OPERADOR'
    mockAuth.mockResolvedValue({ user: { id: role === 'OPERADOR' ? 'op-1' : 'esc-1', role } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' }))
      .rejects.toThrow('Apenas administradores, gerentes ou Escritório podem concluir contratos.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each(['ADM', 'ADMIN', 'ESCRITORIO', 'GERENTE'])('permite %s concluir contrato sem saldo pendente', async (role) => {
    mockAuth.mockResolvedValue({ user: { id: role === 'GERENTE' ? 'op-1' : 'u1', role } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' })).resolves.toBeTruthy()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'loan-1' },
      data: expect.objectContaining({ status: 'QUITADO' }),
    }))
  })

  it('bloqueia Operador ao registrar pagamento que quitaria o contrato', async () => {
    const role = 'OPERADOR'
    mockAuth.mockResolvedValue({ user: { id: role === 'OPERADOR' ? 'op-1' : 'esc-1', role } })

    await expect(addPagamentoParcial({ emprestimoId: 'loan-1', valor: 100, competenciaVencimento: '2026-08-08T00:00:00.000Z', aplicarPrincipal: true }))
      .resolves.toEqual(expect.objectContaining({ ok: false, error: 'Este pagamento quitaria o contrato. A conclusão deve ser feita por um administrador, gerente ou Escritório.' }))
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('permite Escritório registrar pagamento que quita o contrato', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })

    await expect(addPagamentoParcial({ emprestimoId: 'loan-1', valor: 100, competenciaVencimento: '2026-08-08T00:00:00.000Z', aplicarPrincipal: true })).resolves.toBeTruthy()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'QUITADO' }) }))
  })

  it('registra juros na competência mesmo quando a data enviada contém horário', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })
    // O mês anterior pode estar quitado (juros pendentes gerais em zero), mas
    // o juro da competência escolhida ainda deve poder ser recebido.
    mockCalculateLoanInterest.mockReturnValue({ principalRestante: 100, jurosPendente: 0, jurosBase: 10 })
    mockUpdate.mockResolvedValue({ ...contract, status: 'NEGOCIACAO', jurosPagos: 10 })

    await expect(addPagamentoParcial({
      emprestimoId: 'loan-1',
      valor: 10,
      competenciaVencimento: '2026-08-08T03:00:00.000Z',
    })).resolves.toBeTruthy()

    expect(mockCompetenciaCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vencimento: new Date('2026-08-08T00:00:00.000Z'),
        valorPrevisto: 10,
        valorPago: 10,
      }),
    }))
    expect(mockHistoricoCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ competenciaId: 'competencia-1' }),
    }))
  })

  it('permite antecipar juros do próximo mês mesmo com juros pendentes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })
    mockCalculateLoanInterest.mockReturnValue({ principalRestante: 100, jurosPendente: 10, jurosBase: 10 })
    mockUpdate.mockResolvedValue({ ...contract, status: 'NEGOCIACAO', jurosPagos: 10 })

    await expect(addPagamentoParcial({
      emprestimoId: 'loan-1',
      valor: 10,
      competenciaVencimento: '2026-09-08T00:00:00.000Z',
    })).resolves.toBeTruthy()

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ jurosPagos: 10 }),
    }))
  })

  it('registra parcela de acordo sem juros somente com confirmação de principal', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })
    mockFindUnique.mockResolvedValue({ ...contract, jurosMes: 0, quantidadeParcelas: 4 })
    mockCalculateLoanInterest.mockReturnValue({ principalRestante: 100, jurosPendente: 0, jurosBase: 0 })
    mockUpdate.mockResolvedValue({ ...contract, valorPago: 25, status: 'NEGOCIACAO' })

    await expect(addPagamentoParcial({
      emprestimoId: 'loan-1', valor: 25, competenciaVencimento: '2026-08-08T00:00:00.000Z',
    })).resolves.toEqual(expect.objectContaining({ ok: false, error: 'Confirme a opção de abatimento no principal para registrar uma parcela do acordo.' }))

    await expect(addPagamentoParcial({
      emprestimoId: 'loan-1', valor: 25, competenciaVencimento: '2026-08-08T00:00:00.000Z', aplicarPrincipal: true,
    })).resolves.toBeTruthy()
    expect(mockCompetenciaCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ valorPrevisto: 25, valorPago: 25 }),
    }))
  })

  it('permite Escritório reabrir contrato', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'esc-1', role: 'ESCRITORIO' } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'ABERTO' })).resolves.toBeTruthy()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ABERTO' }) }))
  })

  it('bloqueia Operador em contrato de outra carteira', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'op-2', role: 'OPERADOR' } })

    await expect(addEmprestimoHistorico({ emprestimoId: 'loan-1', descricao: 'Contato realizado' }))
      .rejects.toThrow('Você só pode registrar ações nos contratos da própria carteira.')
    await expect(addPagamentoParcial({ emprestimoId: 'loan-1', valor: 10 }))
      .resolves.toEqual(expect.objectContaining({ ok: false, error: 'Você só pode registrar pagamentos nos contratos da própria carteira.' }))
  })

  it('bloqueia Gerente ao concluir contrato de outra carteira', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'ger-2', role: 'GERENTE' } })

    await expect(setEmprestimoStatus({ emprestimoId: 'loan-1', status: 'QUITADO' }))
      .rejects.toThrow('Você só pode alterar contratos da própria carteira.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
