import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findFirst: mockFindFirst,
    },
  },
}))

import { assertUniqueClienteCpf, ClientValidationError, normalizeClienteInput, validateClienteInput } from './client-validation'

describe('client-validation', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
  })

  it('normaliza CPF, WhatsApp e CEP antes de persistir', () => {
    const normalized = normalizeClienteInput({
      nome: ' Maria ',
      cpf: '529.982.247-25',
      whatsapp: '(71) 99999-8888',
      cep: '40100-000',
      endereco: ' Rua A ',
      numeroEndereco: 10,
      bairro: ' Centro ',
      cidade: ' Salvador ',
      estado: ' BA ',
    })

    expect(normalized).toMatchObject({
      nome: 'Maria',
      cpf: '52998224725',
      whatsapp: '71999998888',
      cep: '40100000',
      endereco: 'Rua A',
      bairro: 'Centro',
      cidade: 'Salvador',
      estado: 'BA',
    })
  })

  it('valida campos obrigatórios do cliente', () => {
    expect(() =>
      validateClienteInput({
        nome: '',
        cpf: '52998224725',
        whatsapp: '71999998888',
        cep: '40100000',
        endereco: 'Rua A',
        numeroEndereco: 10,
        bairro: 'Centro',
        cidade: 'Salvador',
        estado: 'BA',
      }),
    ).toThrow('Informe o nome do cliente.')
  })

  it('aceita contatos de emergência no formato legado com hífens', () => {
    expect(() =>
      validateClienteInput({
        nome: 'Diana Francisca da Silva',
        cpf: '04860115341',
        whatsapp: '7183591062',
        cep: '40430130',
        endereco: 'Rua Copacabana',
        numeroEndereco: 19,
        bairro: 'Vila Rui Barbosa',
        cidade: 'Salvador',
        estado: 'BA',
        contatoEmergencia1: 'Esposo - Uilliam - 7193756430',
        contatoEmergencia2: 'Tia - Tânia - 71999104546',
      }),
    ).not.toThrow()

    const normalized = normalizeClienteInput({
      nome: 'Diana Francisca da Silva',
      cpf: '04860115341',
      whatsapp: '7183591062',
      cep: '40430130',
      endereco: 'Rua Copacabana',
      numeroEndereco: 19,
      bairro: 'Vila Rui Barbosa',
      cidade: 'Salvador',
      estado: 'BA',
      contatoEmergencia1: 'Esposo - Uilliam - 7193756430',
      contatoEmergencia2: 'Tia - Tânia - 71999104546',
    })

    expect(normalized.contatoEmergencia1).toBe('Esposo - Uilliam|7193756430')
    expect(normalized.contatoEmergencia2).toBe('Tia - Tânia|71999104546')
  })

  it('permite CPF inexistente', async () => {
    mockFindFirst.mockResolvedValue(null)

    await expect(assertUniqueClienteCpf({ cpf: '529.982.247-25', actorRole: 'GERENTE', actorUserId: 'u1' })).resolves.toBeUndefined()
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cpf: '52998224725' }),
      }),
    )
  })

  it('bloqueia CPF já cadastrado com contrato ativo de outro gerente', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'c1',
      nome: 'Ana Souza',
      loans: [
        {
          id: 'l1',
          status: 'ABERTO',
          usuarioId: 'u2',
          usuario: { nome: 'Carlos' },
        },
      ],
    })

    await expect(assertUniqueClienteCpf({ cpf: '52998224725', actorRole: 'GERENTE', actorUserId: 'u1' })).rejects.toMatchObject({
      name: 'ClientValidationError',
      code: 'DUPLICATE_CPF',
      message: 'Já existe um cliente cadastrado com esse CPF: Ana Souza. O cliente já possui contrato ativo com outro gerente: Carlos.',
    })
  })

  it('bloqueia CPF já cadastrado com contrato ativo sem gerente diferente', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'c1',
      nome: 'Ana Souza',
      loans: [
        {
          id: 'l1',
          status: 'NEGOCIACAO',
          usuarioId: 'u1',
          usuario: { nome: 'Carlos' },
        },
      ],
    })

    await expect(assertUniqueClienteCpf({ cpf: '52998224725', actorRole: 'GERENTE', actorUserId: 'u1' })).rejects.toThrow(
      'Já existe um cliente cadastrado com esse CPF: Ana Souza. O cliente já possui contrato ativo.',
    )
  })

  it('bloqueia CPF já usado por cliente com empréstimo de outro gerente', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'c1',
      nome: 'Ana Souza',
      loans: [
        {
          id: 'l1',
          status: 'QUITADO',
          usuarioId: 'u2',
          usuario: { nome: 'Carlos' },
        },
      ],
    })

    await expect(assertUniqueClienteCpf({ cpf: '52998224725', actorRole: 'GERENTE', actorUserId: 'u1' })).rejects.toThrow(
      'Já existe um cliente cadastrado com esse CPF: Ana Souza. O cliente já tomou empréstimo com outro gerente: Carlos.',
    )
  })

  it('retorna erro tipado para CPF duplicado', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'c1',
      nome: 'Ana Souza',
      loans: [],
    })

    try {
      await assertUniqueClienteCpf({ cpf: '52998224725' })
      throw new Error('expected failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ClientValidationError)
      expect((error as ClientValidationError).code).toBe('DUPLICATE_CPF')
    }
  })
})
