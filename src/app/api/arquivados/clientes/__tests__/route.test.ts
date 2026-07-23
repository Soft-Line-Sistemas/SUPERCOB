import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockAuth,
  mockClienteArquivadoFindMany,
  mockClienteArquivadoCount,
  mockEmprestimoArquivadoGroupBy,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockClienteArquivadoFindMany: vi.fn(),
  mockClienteArquivadoCount: vi.fn(),
  mockEmprestimoArquivadoGroupBy: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    clienteArquivado: {
      findMany: mockClienteArquivadoFindMany,
      count: mockClienteArquivadoCount,
    },
    emprestimoArquivado: {
      groupBy: mockEmprestimoArquivadoGroupBy,
    },
  },
}))

import { GET } from '../route'

describe('GET /api/arquivados/clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/arquivados/clientes'))

    expect(res.status).toBe(401)
    expect(mockClienteArquivadoFindMany).not.toHaveBeenCalled()
  })

  it('retorna 403 quando não é admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

    const res = await GET(new Request('http://localhost/api/arquivados/clientes'))

    expect(res.status).toBe(403)
    expect(mockClienteArquivadoFindMany).not.toHaveBeenCalled()
  })

  it('lista clientes arquivados paginados com contagem de contratos', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteArquivadoFindMany.mockResolvedValue([
      { id: 'cli-1', nome: 'Ana Souza', cpf: '52998224725', whatsapp: '71999998888', arquivadoEm: new Date(), motivoArquivamento: null, arquivadoPor: { nome: 'Admin' }, _count: { documentos: 1 } },
    ])
    mockClienteArquivadoCount.mockResolvedValue(1)
    mockEmprestimoArquivadoGroupBy.mockResolvedValue([{ clienteId: 'cli-1', _count: { _all: 2 } }])

    const res = await GET(new Request('http://localhost/api/arquivados/clientes?page=1&limit=15'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.items[0]).toMatchObject({ id: 'cli-1', nome: 'Ana Souza', totalContratosArquivados: 2 })
    expect(mockClienteArquivadoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { arquivadoEm: 'desc' }, skip: 0, take: 15 }),
    )
  })

  it('filtra por busca textual (nome/cpf/whatsapp)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteArquivadoFindMany.mockResolvedValue([])
    mockClienteArquivadoCount.mockResolvedValue(0)
    mockEmprestimoArquivadoGroupBy.mockResolvedValue([])

    await GET(new Request('http://localhost/api/arquivados/clientes?q=Ana'))

    expect(mockClienteArquivadoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ nome: { contains: 'Ana' } }] },
      }),
    )
  })

  it('não consulta groupBy quando não há resultados', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteArquivadoFindMany.mockResolvedValue([])
    mockClienteArquivadoCount.mockResolvedValue(0)

    const res = await GET(new Request('http://localhost/api/arquivados/clientes'))

    expect(res.status).toBe(200)
    expect(mockEmprestimoArquivadoGroupBy).not.toHaveBeenCalled()
  })

  it('retorna 500 em caso de erro inesperado', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockClienteArquivadoFindMany.mockRejectedValue(new Error('db down'))

    const res = await GET(new Request('http://localhost/api/arquivados/clientes'))

    expect(res.status).toBe(500)
  })
})
