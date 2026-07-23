import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockArchiveCliente,
  mockUnarchiveCliente,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockArchiveCliente: vi.fn(),
  mockUnarchiveCliente: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/archive', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/archive')>()
  return {
    ...actual,
    archiveCliente: mockArchiveCliente,
    unarchiveCliente: mockUnarchiveCliente,
  }
})

import { archiveClienteAction, unarchiveClienteAction } from './actions'
import { ArchiveError } from '@/lib/archive'

describe('clientes actions - archive/unarchive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('archiveClienteAction', () => {
    it('bloqueia sem sessão', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await archiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' })
      expect(mockArchiveCliente).not.toHaveBeenCalled()
    })

    it('bloqueia usuário não admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

      const result = await archiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Apenas administradores podem arquivar clientes.', code: 'FORBIDDEN' })
      expect(mockArchiveCliente).not.toHaveBeenCalled()
    })

    it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao arquivar cliente', async (role) => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

      const result = await archiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Apenas administradores podem arquivar clientes.', code: 'FORBIDDEN' })
      expect(mockArchiveCliente).not.toHaveBeenCalled()
    })

    it('arquiva o cliente e revalida as rotas quando admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockArchiveCliente.mockResolvedValue(undefined)

      const result = await archiveClienteAction('cli-1', 'Encerramento solicitado')

      expect(mockArchiveCliente).toHaveBeenCalledWith('cli-1', { actorUserId: 'admin-1', motivo: 'Encerramento solicitado' })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/clientes')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/arquivados')
      expect(result).toEqual({ ok: true, id: 'cli-1' })
    })

    it('propaga o code de ArchiveError (ex: NOT_FOUND)', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockArchiveCliente.mockRejectedValue(new ArchiveError('NOT_FOUND', 'Cliente não encontrado.'))

      const result = await archiveClienteAction('cli-inexistente')

      expect(result).toEqual({ ok: false, error: 'Cliente não encontrado.', code: 'NOT_FOUND' })
    })

    it('retorna INTERNAL_ERROR para falhas inesperadas', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockArchiveCliente.mockRejectedValue(new Error('conexão perdida'))

      const result = await archiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Erro ao arquivar cliente.', code: 'INTERNAL_ERROR' })
    })
  })

  describe('unarchiveClienteAction', () => {
    it('bloqueia sem sessão', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await unarchiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' })
      expect(mockUnarchiveCliente).not.toHaveBeenCalled()
    })

    it('bloqueia usuário não admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

      const result = await unarchiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Apenas administradores podem desarquivar clientes.', code: 'FORBIDDEN' })
      expect(mockUnarchiveCliente).not.toHaveBeenCalled()
    })

    it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao desarquivar cliente', async (role) => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

      const result = await unarchiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Apenas administradores podem desarquivar clientes.', code: 'FORBIDDEN' })
      expect(mockUnarchiveCliente).not.toHaveBeenCalled()
    })

    it('desarquiva o cliente e revalida as rotas quando admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockUnarchiveCliente.mockResolvedValue(undefined)

      const result = await unarchiveClienteAction('cli-1')

      expect(mockUnarchiveCliente).toHaveBeenCalledWith('cli-1', { actorUserId: 'admin-1' })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/clientes')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/arquivados')
      expect(result).toEqual({ ok: true, id: 'cli-1' })
    })

    it('propaga o code DUPLICATE_CPF de ArchiveError', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockUnarchiveCliente.mockRejectedValue(new ArchiveError('DUPLICATE_CPF', 'Já existe um cliente cadastrado com esse CPF: Ana.'))

      const result = await unarchiveClienteAction('cli-1')

      expect(result).toEqual({ ok: false, error: 'Já existe um cliente cadastrado com esse CPF: Ana.', code: 'DUPLICATE_CPF' })
    })
  })
})
