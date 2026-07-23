import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAuth, mockFindFirst, mockReadFile } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindFirst: vi.fn(),
  mockReadFile: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    clienteDocumentoArquivado: {
      findFirst: mockFindFirst,
    },
  },
}))
vi.mock('fs/promises', () => ({ default: { readFile: mockReadFile }, readFile: mockReadFile }))

import { GET } from '../route'

function params(id: string, docId: string) {
  return { params: Promise.resolve({ id, docId }) }
}

describe('GET /api/clientes/[id]/documentos-arquivados/[docId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 sem sessão', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-1'), params('cli-1', 'doc-1'))

    expect(res.status).toBe(401)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('retorna 403 quando não é admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'GERENTE' } })

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-1'), params('cli-1', 'doc-1'))

    expect(res.status).toBe(403)
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('retorna 404 quando o documento arquivado não existe para o cliente', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindFirst.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-x'), params('cli-1', 'doc-x'))

    expect(res.status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 'doc-x', clienteId: 'cli-1' } })
  })

  it('retorna o arquivo com Content-Disposition inline para PDF por padrão', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindFirst.mockResolvedValue({
      id: 'doc-1',
      clienteId: 'cli-1',
      fileName: 'stored-name.pdf',
      originalName: 'rg.pdf',
      mimeType: 'application/pdf',
    })
    mockReadFile.mockResolvedValue(Buffer.from('conteudo-pdf'))

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-1'), params('cli-1', 'doc-1'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('inline')
    expect(res.headers.get('Content-Disposition')).toContain('rg.pdf')
  })

  it('força download quando ?download=1', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindFirst.mockResolvedValue({
      id: 'doc-1',
      clienteId: 'cli-1',
      fileName: 'stored-name.pdf',
      originalName: 'rg.pdf',
      mimeType: 'application/pdf',
    })
    mockReadFile.mockResolvedValue(Buffer.from('conteudo-pdf'))

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-1?download=1'), params('cli-1', 'doc-1'))

    expect(res.headers.get('Content-Disposition')).toContain('attachment')
  })

  it('retorna 500 quando o arquivo físico não é encontrado em disco', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockFindFirst.mockResolvedValue({
      id: 'doc-1',
      clienteId: 'cli-1',
      fileName: 'stored-name.pdf',
      originalName: 'rg.pdf',
      mimeType: 'application/pdf',
    })
    mockReadFile.mockRejectedValue(new Error('ENOENT'))

    const res = await GET(new Request('http://localhost/api/clientes/cli-1/documentos-arquivados/doc-1'), params('cli-1', 'doc-1'))

    expect(res.status).toBe(500)
  })
})
