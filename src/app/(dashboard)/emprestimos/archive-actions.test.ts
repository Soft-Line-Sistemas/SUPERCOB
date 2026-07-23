import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockRevalidatePath,
  mockArchiveEmprestimo,
  mockUnarchiveEmprestimo,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockArchiveEmprestimo: vi.fn(),
  mockUnarchiveEmprestimo: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('@/lib/audit', () => ({ logSystemAction: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/archive', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/archive')>()
  return {
    ...actual,
    archiveEmprestimo: mockArchiveEmprestimo,
    unarchiveEmprestimo: mockUnarchiveEmprestimo,
  }
})

import { archiveEmprestimoAction, unarchiveEmprestimoAction } from './actions'
import { ArchiveError } from '@/lib/archive'

describe('emprestimos actions - archive/unarchive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('archiveEmprestimoAction', () => {
    it('lança Unauthorized sem sessão', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(archiveEmprestimoAction('loan-1')).rejects.toThrow('Unauthorized')
      expect(mockArchiveEmprestimo).not.toHaveBeenCalled()
    })

    it('bloqueia usuário não admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

      await expect(archiveEmprestimoAction('loan-1')).rejects.toThrow('Apenas administradores podem arquivar contratos.')
      expect(mockArchiveEmprestimo).not.toHaveBeenCalled()
    })

    it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao arquivar contrato', async (role) => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

      await expect(archiveEmprestimoAction('loan-1')).rejects.toThrow('Apenas administradores podem arquivar contratos.')
      expect(mockArchiveEmprestimo).not.toHaveBeenCalled()
    })

    it('arquiva o contrato e revalida as rotas quando admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockArchiveEmprestimo.mockResolvedValue(undefined)

      await archiveEmprestimoAction('loan-1', 'Contrato quitado há muito tempo')

      expect(mockArchiveEmprestimo).toHaveBeenCalledWith('loan-1', { actorUserId: 'admin-1', motivo: 'Contrato quitado há muito tempo' })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/emprestimos')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/arquivados')
    })

    it('propaga ArchiveError (ex: NOT_FOUND)', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockArchiveEmprestimo.mockRejectedValue(new ArchiveError('NOT_FOUND', 'Contrato não encontrado.'))

      await expect(archiveEmprestimoAction('loan-x')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'NOT_FOUND',
        message: 'Contrato não encontrado.',
      })
    })
  })

  describe('unarchiveEmprestimoAction', () => {
    it('lança Unauthorized sem sessão', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(unarchiveEmprestimoAction('loan-1')).rejects.toThrow('Unauthorized')
      expect(mockUnarchiveEmprestimo).not.toHaveBeenCalled()
    })

    it('bloqueia usuário não admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

      await expect(unarchiveEmprestimoAction('loan-1')).rejects.toThrow('Apenas administradores podem desarquivar contratos.')
      expect(mockUnarchiveEmprestimo).not.toHaveBeenCalled()
    })

    it.each(['ESCRITORIO', 'GERENTE', 'OPERADOR'])('bloqueia %s ao desarquivar contrato', async (role) => {
      mockAuth.mockResolvedValue({ user: { id: 'u1', role } })

      await expect(unarchiveEmprestimoAction('loan-1')).rejects.toThrow('Apenas administradores podem desarquivar contratos.')
      expect(mockUnarchiveEmprestimo).not.toHaveBeenCalled()
    })

    it('desarquiva o contrato e revalida as rotas quando admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockUnarchiveEmprestimo.mockResolvedValue(undefined)

      await unarchiveEmprestimoAction('loan-1')

      expect(mockUnarchiveEmprestimo).toHaveBeenCalledWith('loan-1', { actorUserId: 'admin-1' })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/emprestimos')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/arquivados')
    })

    it('propaga ArchiveError (ex: CLIENT_MISSING)', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
      mockUnarchiveEmprestimo.mockRejectedValue(
        new ArchiveError('CLIENT_MISSING', 'O cliente deste contrato também está arquivado. Desarquive o cliente primeiro.'),
      )

      await expect(unarchiveEmprestimoAction('loan-1')).rejects.toMatchObject({
        name: 'ArchiveError',
        code: 'CLIENT_MISSING',
      })
    })
  })
})
