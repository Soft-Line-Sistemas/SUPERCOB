import { describe, expect, it } from 'vitest'
import { clientSchema, formatCEP, formatCPF, formatPhoneBR, normalizeClientPayload, tabRequiredFields } from '../form-schema'

const validData = {
  nome: 'João Silva',
  indicacao: '',
  cpf: '529.982.247-25',
  rg: '',
  orgao: '',
  diaNasc: '10',
  mesNasc: '10',
  anoNasc: '1990',
  email: 'joao@teste.com',
  whatsapp: '(11) 91234-5678',
  instagram: '',
  cep: '01001-000',
  endereco: 'Rua A',
  numeroEndereco: '123',
  complemento: '',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  pontoReferencia: '',
  profissao: '',
  empresa: '',
  cepEmpresa: '',
  enderecoEmpresa: '',
  cidadeEmpresa: '',
  estadoEmpresa: '',
  contatoEmergencia1: '',
  contatoEmergencia2: '',
  contatoEmergencia3: '',
}

describe('client form schema', () => {
  it('valida campos obrigatórios por etapa', async () => {
    expect(tabRequiredFields.basico).toEqual(['nome', 'whatsapp'])
    expect(tabRequiredFields.identificacao).toContain('cpf')
    expect(tabRequiredFields.endereco).toContain('cep')
  })

  it('aplica máscaras automaticamente', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25')
    expect(formatCEP('01001000')).toBe('01001-000')
    expect(formatPhoneBR('11912345678')).toBe('(11) 91234-5678')
  })

  it('valida erros em tempo real via schema', () => {
    const result = clientSchema.safeParse({ ...validData, cpf: '111.111.111-11', whatsapp: '(11) 9' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('CPF inválido.')
      expect(messages).toContain('Informe um WhatsApp válido.')
    }
  })

  it('normaliza payload antes do envio', () => {
    const payload = normalizeClientPayload({ ...validData, cepEmpresa: '22.222-222' })
    expect(payload.cpf).toBe('52998224725')
    expect(payload.whatsapp).toBe('11912345678')
    expect(payload.cep).toBe('01001000')
    expect(payload.cepEmpresa).toBe('22222222')
  })
})
