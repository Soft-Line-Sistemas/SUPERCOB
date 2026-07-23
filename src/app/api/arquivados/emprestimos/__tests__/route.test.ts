import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockEmprestimoArquivadoFindMany,
  mockEmprestimoArquivadoCount,
  mockClienteFindMany,
  mockClienteArquivadoFindMany,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockEmprestimoArquivadoFindMany: vi.fn(),
  mockEmprestimoArquivadoCount: vi.fn(),
  mockClienteFindMany: vi.fn(),
  mockClienteArquivadoFindMany: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emprestimoArquivado: {
      findMany: mockEmprestimoArquivadoFindMany,
      count: mockEmprestimoArquivadoCount,
    },
    cliente: {
      findMany: mockClienteFindMany,
    },
    clienteArquivado: {
      findMany: mockClienteArquivadoFindMany,
    },
  },
}))

import { GET } from '../route'

describe('GET /api/arquivados/emprestimos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    expect(res.status).toBe(401)
    expect(mockEmprestimoArquivadoFindMany).not.toHaveBeenCalled()
  })

  it('retorna 403 quando não é admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    expect(res.status).toBe(403)
  })

  it('resolve o nome do cliente quando ele está ativo', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockEmprestimoArquivadoFindMany.mockResolvedValue([
      { id: 'loan-1', clienteId: 'cli-1', valor: 1000, status: 'ABERTO', vencimento: null, quitadoEm: null, arquivadoEm: new Date(), motivoArquivamento: null, clienteTambemArquivado: false, arquivadoPor: null, usuario: null },
    ])
    mockEmprestimoArquivadoCount.mockResolvedValue(1)
    mockClienteFindMany.mockResolvedValue([{ id: 'cli-1', nome: 'Ana Souza' }])
    mockClienteArquivadoFindMany.mockResolvedValue([])

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0]).toMatchObject({ id: 'loan-1', clienteNome: 'Ana Souza' })
  })

  it('resolve o nome do cliente quando ele também está arquivado', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockEmprestimoArquivadoFindMany.mockResolvedValue([
      { id: 'loan-1', clienteId: 'cli-1', valor: 1000, status: 'ABERTO', vencimento: null, quitadoEm: null, arquivadoEm: new Date(), motivoArquivamento: null, clienteTambemArquivado: true, arquivadoPor: null, usuario: null },
    ])
    mockEmprestimoArquivadoCount.mockResolvedValue(1)
    mockClienteFindMany.mockResolvedValue([])
    mockClienteArquivadoFindMany.mockResolvedValue([{ id: 'cli-1', nome: 'Ana Souza (arquivada)' }])

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    const body = await res.json()
    expect(body.items[0].clienteNome).toBe('Ana Souza (arquivada)')
  })

  it('usa placeholder quando o cliente não existe em nenhuma tabela', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockEmprestimoArquivadoFindMany.mockResolvedValue([
      { id: 'loan-1', clienteId: 'cli-removido', valor: 1000, status: 'ABERTO', vencimento: null, quitadoEm: null, arquivadoEm: new Date(), motivoArquivamento: null, clienteTambemArquivado: false, arquivadoPor: null, usuario: null },
    ])
    mockEmprestimoArquivadoCount.mockResolvedValue(1)
    mockClienteFindMany.mockResolvedValue([])
    mockClienteArquivadoFindMany.mockResolvedValue([])

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    const body = await res.json()
    expect(body.items[0].clienteNome).toBe('(cliente removido)')
  })

  it('não consulta clientes quando não há contratos na página', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockEmprestimoArquivadoFindMany.mockResolvedValue([])
    mockEmprestimoArquivadoCount.mockResolvedValue(0)

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    expect(res.status).toBe(200)
    expect(mockClienteFindMany).not.toHaveBeenCalled()
    expect(mockClienteArquivadoFindMany).not.toHaveBeenCalled()
  })

  it('retorna 500 em caso de erro inesperado', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockEmprestimoArquivadoFindMany.mockRejectedValue(new Error('db down'))

    const res = await GET(new Request('http://localhost/api/arquivados/emprestimos'))

    expect(res.status).toBe(500)
  })
})
