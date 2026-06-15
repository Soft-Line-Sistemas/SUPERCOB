'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/admin-auth'

type ClienteInput = {
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

function validateClienteInput(data: ClienteInput) {
  if (!data.nome || data.nome.trim() === '') throw new Error('Nome é obrigatório')

  const whatsapp = (data.whatsapp ?? '').replace(/\D/g, '')
  if (whatsapp.length < 10) throw new Error('WhatsApp inválido')

  const cpf = (data.cpf ?? '').replace(/\D/g, '')
  if (cpf.length !== 11) throw new Error('CPF inválido')

  const anyBirth = data.diaNasc != null || data.mesNasc != null || data.anoNasc != null
  if (anyBirth) {
    if (!data.diaNasc || !data.mesNasc || !data.anoNasc) throw new Error('Data de nascimento incompleta')
    if (data.diaNasc < 1 || data.diaNasc > 31) throw new Error('Dia inválido (01-31)')
    if (data.mesNasc < 1 || data.mesNasc > 12) throw new Error('Mês inválido (01-12)')
    const anoAtual = new Date().getFullYear()
    if (data.anoNasc < 1900 || data.anoNasc > anoAtual) throw new Error('Ano inválido')
    const dt = new Date(Date.UTC(data.anoNasc, data.mesNasc - 1, data.diaNasc, 12, 0, 0, 0))
    if (dt.getUTCFullYear() !== data.anoNasc || dt.getUTCMonth() !== data.mesNasc - 1 || dt.getUTCDate() !== data.diaNasc) {
      throw new Error('Data de nascimento inválida')
    }
  }

  const cep = (data.cep ?? '').replace(/\D/g, '')
  if (cep.length !== 8) throw new Error('CEP inválido')

  if (!data.endereco || data.endereco.trim() === '') throw new Error('Endereço é obrigatório')
  if (!data.numeroEndereco || data.numeroEndereco <= 0) throw new Error('Número do endereço é obrigatório')
  if (!data.bairro || data.bairro.trim() === '') throw new Error('Bairro é obrigatório')
  if (!data.cidade || data.cidade.trim() === '') throw new Error('Cidade é obrigatória')
  if (!data.estado || data.estado.trim() === '') throw new Error('Estado é obrigatório')

  if (data.cep2) {
    const cep2 = data.cep2.replace(/\D/g, '')
    if (cep2.length !== 8) throw new Error('CEP secundário inválido')
  }
}

export async function getClientes(options?: { includeIds?: string[] }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (role === 'GERENTE') {
    const includeIds = (options?.includeIds ?? []).filter((id) => typeof id === 'string' && id.trim() !== '')
    const orConditions: Prisma.ClienteWhereInput[] = [
      { loans: { some: { usuarioId: userId } } },
    ]

    if (includeIds.length > 0) {
      orConditions.push({ id: { in: includeIds } })
    }

    return await prisma.cliente.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ADM e ESCRITORIO veem tudo
  return await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getClientesPage(options?: {
  includeIds?: string[]
  page?: number
  perPage?: number
  search?: string
  email?: string
  whatsapp?: string
  cidade?: string
  estado?: string
  cpf?: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const includeIds = (options?.includeIds ?? []).filter((id) => typeof id === 'string' && id.trim() !== '')
  const page = Math.max(1, options?.page ?? 1)
  const perPage = Math.min(100, Math.max(1, options?.perPage ?? 15))
  const skip = (page - 1) * perPage
  const search = (options?.search ?? '').trim()
  const email = (options?.email ?? '').trim()
  const whatsapp = (options?.whatsapp ?? '').replace(/\D/g, '')
  const cidade = (options?.cidade ?? '').trim()
  const estado = (options?.estado ?? '').trim()
  const cpf = (options?.cpf ?? '').replace(/\D/g, '')

  let where: Prisma.ClienteWhereInput | undefined

  if (role === 'GERENTE') {
    const orConditions: Prisma.ClienteWhereInput[] = [{ loans: { some: { usuarioId: userId } } }]

    if (includeIds.length > 0) {
      orConditions.push({ id: { in: includeIds } })
    }

    where = { OR: orConditions }
  } else if (includeIds.length > 0) {
    where = { id: { in: includeIds } }
  }

  const andConditions: Prisma.ClienteWhereInput[] = []

  if (search !== '') {
    const searchDigits = search.replace(/\D/g, '')
    andConditions.push({
      OR: [
        { nome: { contains: search } },
        { email: { contains: search } },
        { cidade: { contains: search } },
        { estado: { contains: search } },
        ...(searchDigits
          ? [
              { whatsapp: { contains: searchDigits } },
              { cpf: { contains: searchDigits } },
            ]
          : []),
      ],
    })
  }

  if (email !== '') {
    andConditions.push({ email: { contains: email } })
  }

  if (whatsapp !== '') {
    andConditions.push({ whatsapp: { contains: whatsapp } })
  }

  if (cidade !== '') {
    andConditions.push({ cidade: { contains: cidade } })
  }

  if (estado !== '') {
    andConditions.push({ estado: { contains: estado } })
  }

  if (cpf !== '') {
    andConditions.push({ cpf: { contains: cpf } })
  }

  if (andConditions.length > 0) {
    where = where ? { AND: [where, ...andConditions] } : { AND: andConditions }
  }

  const [items, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.cliente.count({ where }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function createCliente(data: ClienteInput) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  validateClienteInput(data)

  const cliente = await prisma.cliente.create({
    data,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function updateCliente(id: string, data: ClienteInput) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  validateClienteInput(data)

  const cliente = await prisma.cliente.update({
    where: { id },
    data,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function deleteCliente(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  if (!isAdminRole(role)) throw new Error('Apenas administradores podem excluir clientes.')

  await prisma.cliente.delete({
    where: { id },
  })
  revalidatePath('/clientes')
}
