import { z } from 'zod'
import { validateBirthDateParts } from '../../lib/date-utils'
import type { ClientFormData, ClientModalTab } from './types'

export const clientFormDefaults: ClientFormData = {
  nome: '',
  indicacao: '',
  cpf: '',
  rg: '',
  orgao: '',
  diaNasc: '',
  mesNasc: '',
  anoNasc: '',
  email: '',
  whatsapp: '',
  instagram: '',
  cep: '',
  endereco: '',
  numeroEndereco: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
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

export const normalizeDigits = (value: string) => value.replace(/\D/g, '')

export const formatCPF = (value: string) => {
  const d = normalizeDigits(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export const formatPhoneBR = (value: string) => {
  const d = normalizeDigits(value).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export const formatCEP = (value: string) => {
  const d = normalizeDigits(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export const isValidCPF = (cpf: string) => {
  const digits = normalizeDigits(cpf)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const d1 = calc(9)
  const d2 = calc(10)
  return d1 === Number(digits[9]) && d2 === Number(digits[10])
}

export const clientSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente.'),
  indicacao: z.string(),
  cpf: z.string().refine((v) => isValidCPF(v), 'CPF inválido.'),
  rg: z.string(),
  orgao: z.string(),
  diaNasc: z.string(),
  mesNasc: z.string(),
  anoNasc: z.string(),
  email: z.string().email('E-mail inválido.').or(z.literal('')),
  whatsapp: z.string().refine((v) => normalizeDigits(v).length >= 10, 'Informe um WhatsApp válido.'),
  instagram: z.string(),
  cep: z.string().refine((v) => normalizeDigits(v).length === 8, 'Informe um CEP válido.'),
  endereco: z.string().trim().min(1, 'Informe o endereço.'),
  numeroEndereco: z.string().refine((v) => {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0
  }, 'Informe o número do endereço.'),
  complemento: z.string(),
  bairro: z.string().trim().min(1, 'Informe o bairro.'),
  cidade: z.string().trim().min(1, 'Informe a cidade.'),
  estado: z.string().trim().min(1, 'Informe o estado.'),
  pontoReferencia: z.string(),
  profissao: z.string(),
  empresa: z.string(),
  cepEmpresa: z.string(),
  enderecoEmpresa: z.string(),
  cidadeEmpresa: z.string(),
  estadoEmpresa: z.string(),
  contatoEmergencia1: z.string(),
  contatoEmergencia2: z.string(),
  contatoEmergencia3: z.string(),
}).superRefine((data, ctx) => {
  const birthCheck = validateBirthDateParts(data.diaNasc, data.mesNasc, data.anoNasc)
  if (birthCheck.dia) ctx.addIssue({ code: 'custom', path: ['diaNasc'], message: birthCheck.dia })
  if (birthCheck.mes) ctx.addIssue({ code: 'custom', path: ['mesNasc'], message: birthCheck.mes })
  if (birthCheck.ano) ctx.addIssue({ code: 'custom', path: ['anoNasc'], message: birthCheck.ano })
})

export const tabRequiredFields: Record<ClientModalTab, Array<keyof ClientFormData>> = {
  basico: ['nome', 'whatsapp'],
  identificacao: ['cpf', 'diaNasc', 'mesNasc', 'anoNasc'],
  endereco: ['cep', 'endereco', 'numeroEndereco', 'bairro', 'cidade', 'estado'],
  profissao: [],
  emergencia: [],
  cobranca: [],
  anexos: [],
  revisao: [],
}

export const normalizeClientPayload = (formData: ClientFormData) => {
  const normalizeOptional = (value: string) => {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  const parseIntOrNull = (value: string) => {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const num = Number.parseInt(trimmed, 10)
    return Number.isFinite(num) ? num : null
  }

  return {
    nome: formData.nome.trim(),
    indicacao: normalizeOptional(formData.indicacao),
    cpf: normalizeDigits(formData.cpf),
    rg: normalizeOptional(formData.rg),
    orgao: normalizeOptional(formData.orgao),
    diaNasc: parseIntOrNull(formData.diaNasc),
    mesNasc: parseIntOrNull(formData.mesNasc),
    anoNasc: parseIntOrNull(formData.anoNasc),
    email: normalizeOptional(formData.email),
    whatsapp: normalizeDigits(formData.whatsapp),
    instagram: normalizeOptional(formData.instagram),
    cep: normalizeDigits(formData.cep),
    endereco: normalizeOptional(formData.endereco),
    numeroEndereco: parseIntOrNull(formData.numeroEndereco),
    complemento: normalizeOptional(formData.complemento),
    bairro: normalizeOptional(formData.bairro),
    cidade: normalizeOptional(formData.cidade),
    estado: normalizeOptional(formData.estado),
    pontoReferencia: normalizeOptional(formData.pontoReferencia),
    profissao: normalizeOptional(formData.profissao),
    empresa: normalizeOptional(formData.empresa),
    cepEmpresa: normalizeOptional(normalizeDigits(formData.cepEmpresa)),
    enderecoEmpresa: normalizeOptional(formData.enderecoEmpresa),
    cidadeEmpresa: normalizeOptional(formData.cidadeEmpresa),
    estadoEmpresa: normalizeOptional(formData.estadoEmpresa),
    contatoEmergencia1: normalizeOptional(formData.contatoEmergencia1),
    contatoEmergencia2: normalizeOptional(formData.contatoEmergencia2),
    contatoEmergencia3: normalizeOptional(formData.contatoEmergencia3),
  }
}
