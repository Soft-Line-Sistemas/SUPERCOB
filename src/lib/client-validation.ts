import { prisma } from '@/lib/prisma'
import {
  EMERGENCY_CONTACT_NAME_MAX_LENGTH,
  EMERGENCY_CONTACT_PHONE_MAX_LENGTH,
  isEmergencyContactValid,
  normalizeEmergencyContact,
} from '@/lib/client-emergency'

export type ClienteInput = {
  nome: string
  indicacao?: string | null
  cpf?: string | null
  rg?: string | null
  orgao?: string | null
  diaNasc?: number | null
  mesNasc?: number | null
  anoNasc?: number | null
  email?: string | null
  whatsapp?: string | null
  instagram?: string | null
  cep?: string | null
  endereco?: string | null
  numeroEndereco?: number | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  pontoReferencia?: string | null
  profissao?: string | null
  empresa?: string | null
  cepEmpresa?: string | null
  enderecoEmpresa?: string | null
  cidadeEmpresa?: string | null
  estadoEmpresa?: string | null
  contatoEmergencia1?: string | null
  contatoEmergencia2?: string | null
  contatoEmergencia3?: string | null
  telefone2?: string | null
  observacoes?: string | null
  cep2?: string | null
  endereco2?: string | null
  numeroEndereco2?: number | null
  complemento2?: string | null
  bairro2?: string | null
  cidade2?: string | null
  estado2?: string | null
  pontoReferencia2?: string | null
}

type ClientValidationCode = 'INVALID_INPUT' | 'DUPLICATE_CPF'

export class ClientValidationError extends Error {
  code: ClientValidationCode

  constructor(code: ClientValidationCode, message: string) {
    super(message)
    this.name = 'ClientValidationError'
    this.code = code
  }
}

const ACTIVE_LOAN_STATUSES = ['ABERTO', 'NEGOCIACAO']

const normalizeDigits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')

function invalid(message: string): never {
  throw new ClientValidationError('INVALID_INPUT', message)
}

export function validateClienteInput(data: ClienteInput) {
  if (!data.nome || data.nome.trim() === '') invalid('Informe o nome do cliente.')

  const whatsapp = normalizeDigits(data.whatsapp)
  if (whatsapp.length < 10) invalid('Informe um WhatsApp válido.')

  const cpf = normalizeDigits(data.cpf)
  if (cpf.length !== 11) invalid('CPF inválido.')

  const anyBirth = data.diaNasc != null || data.mesNasc != null || data.anoNasc != null
  if (anyBirth) {
    if (!data.diaNasc || !data.mesNasc || !data.anoNasc) invalid('Data de nascimento incompleta.')
    if (data.diaNasc < 1 || data.diaNasc > 31) invalid('Dia inválido (01-31).')
    if (data.mesNasc < 1 || data.mesNasc > 12) invalid('Mês inválido (01-12).')
    const anoAtual = new Date().getFullYear()
    if (data.anoNasc < 1900 || data.anoNasc > anoAtual) invalid('Ano inválido.')
    const dt = new Date(Date.UTC(data.anoNasc, data.mesNasc - 1, data.diaNasc, 12, 0, 0, 0))
    if (dt.getUTCFullYear() !== data.anoNasc || dt.getUTCMonth() !== data.mesNasc - 1 || dt.getUTCDate() !== data.diaNasc) {
      invalid('Data de nascimento inválida.')
    }
  }

  const cep = normalizeDigits(data.cep)
  if (cep.length !== 8) invalid('Informe um CEP válido.')

  if (!data.endereco || data.endereco.trim() === '') invalid('Informe o endereço.')
  if (!data.numeroEndereco || data.numeroEndereco <= 0) invalid('Informe o número do endereço.')
  if (!data.bairro || data.bairro.trim() === '') invalid('Informe o bairro.')
  if (!data.cidade || data.cidade.trim() === '') invalid('Informe a cidade.')
  if (!data.estado || data.estado.trim() === '') invalid('Informe o estado.')

  if (data.cep2) {
    const cep2 = normalizeDigits(data.cep2)
    if (cep2.length !== 8) invalid('CEP secundário inválido.')
  }

  if (!isEmergencyContactValid(data.contatoEmergencia1)) {
    invalid(`Contato de emergência deve ter até ${EMERGENCY_CONTACT_NAME_MAX_LENGTH} caracteres no nome e ${EMERGENCY_CONTACT_PHONE_MAX_LENGTH} no telefone.`)
  }

  if (!isEmergencyContactValid(data.contatoEmergencia2)) {
    invalid(`Contato de emergência deve ter até ${EMERGENCY_CONTACT_NAME_MAX_LENGTH} caracteres no nome e ${EMERGENCY_CONTACT_PHONE_MAX_LENGTH} no telefone.`)
  }

  if (!isEmergencyContactValid(data.contatoEmergencia3)) {
    invalid(`Contato de emergência deve ter até ${EMERGENCY_CONTACT_NAME_MAX_LENGTH} caracteres no nome e ${EMERGENCY_CONTACT_PHONE_MAX_LENGTH} no telefone.`)
  }
}

export function normalizeClienteInput(data: ClienteInput): ClienteInput {
  const normalizeOptional = (value: string | null | undefined) => {
    const trimmed = (value ?? '').trim()
    return trimmed === '' ? null : trimmed
  }

  return {
    ...data,
    nome: data.nome.trim(),
    indicacao: normalizeOptional(data.indicacao),
    cpf: normalizeOptional(normalizeDigits(data.cpf)),
    rg: normalizeOptional(data.rg),
    orgao: normalizeOptional(data.orgao),
    email: normalizeOptional(data.email),
    whatsapp: normalizeOptional(normalizeDigits(data.whatsapp)),
    instagram: normalizeOptional(data.instagram),
    cep: normalizeOptional(normalizeDigits(data.cep)),
    endereco: normalizeOptional(data.endereco),
    complemento: normalizeOptional(data.complemento),
    bairro: normalizeOptional(data.bairro),
    cidade: normalizeOptional(data.cidade),
    estado: normalizeOptional(data.estado),
    pontoReferencia: normalizeOptional(data.pontoReferencia),
    profissao: normalizeOptional(data.profissao),
    empresa: normalizeOptional(data.empresa),
    cepEmpresa: normalizeOptional(normalizeDigits(data.cepEmpresa)),
    enderecoEmpresa: normalizeOptional(data.enderecoEmpresa),
    cidadeEmpresa: normalizeOptional(data.cidadeEmpresa),
    estadoEmpresa: normalizeOptional(data.estadoEmpresa),
    contatoEmergencia1: normalizeEmergencyContact(data.contatoEmergencia1),
    contatoEmergencia2: normalizeEmergencyContact(data.contatoEmergencia2),
    contatoEmergencia3: normalizeEmergencyContact(data.contatoEmergencia3),
    telefone2: normalizeOptional(data.telefone2),
    observacoes: normalizeOptional(data.observacoes),
    cep2: normalizeOptional(normalizeDigits(data.cep2)),
    endereco2: normalizeOptional(data.endereco2),
    complemento2: normalizeOptional(data.complemento2),
    bairro2: normalizeOptional(data.bairro2),
    cidade2: normalizeOptional(data.cidade2),
    estado2: normalizeOptional(data.estado2),
    pontoReferencia2: normalizeOptional(data.pontoReferencia2),
  }
}

export async function assertUniqueClienteCpf(input: {
  cpf?: string | null
  currentClientId?: string
  actorRole?: string | null
  actorUserId?: string | null
}) {
  const cpf = normalizeDigits(input.cpf)
  if (cpf.length !== 11) return

  const existingClient = await prisma.cliente.findFirst({
    where: {
      cpf,
      ...(input.currentClientId ? { id: { not: input.currentClientId } } : {}),
    },
    select: {
      id: true,
      nome: true,
      loans: {
        select: {
          id: true,
          status: true,
          usuarioId: true,
          usuario: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!existingClient) return

  const activeLoan = existingClient.loans.find((loan) => ACTIVE_LOAN_STATUSES.includes(loan.status))
  const otherManagerLoan = existingClient.loans.find((loan) => loan.usuarioId && loan.usuarioId !== input.actorUserId)
  const otherManagerActiveLoan = existingClient.loans.find(
    (loan) => ACTIVE_LOAN_STATUSES.includes(loan.status) && loan.usuarioId && loan.usuarioId !== input.actorUserId,
  )

  let message = `Já existe um cliente cadastrado com esse CPF: ${existingClient.nome}.`

  if (otherManagerActiveLoan?.usuario?.nome) {
    message = `${message} O cliente já possui contrato ativo com outro gerente: ${otherManagerActiveLoan.usuario.nome}.`
  } else if (activeLoan) {
    message = `${message} O cliente já possui contrato ativo.`
  } else if (otherManagerLoan?.usuario?.nome && input.actorRole === 'GERENTE') {
    message = `${message} O cliente já tomou empréstimo com outro gerente: ${otherManagerLoan.usuario.nome}.`
  }

  throw new ClientValidationError('DUPLICATE_CPF', message)
}
