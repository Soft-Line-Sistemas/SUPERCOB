'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/admin-auth'
import {
  assertUniqueClienteCpf,
  ClientValidationError,
  type ClienteInput,
  normalizeClienteInput,
  validateClienteInput,
} from '@/lib/client-validation'
import { archiveCliente, ArchiveError, unarchiveCliente } from '@/lib/archive'

type ClienteMutationResult =
  | { ok: true; id: string }
  | {
      ok: false
      error: string
      code?:
        | 'INVALID_INPUT'
        | 'DUPLICATE_CPF'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'INTERNAL_ERROR'
        | 'NOT_FOUND'
        | 'CLIENT_MISSING'
    }

type ClienteCpfValidationResult =
  | { ok: true }
  | { ok: false; error: string; code?: 'INVALID_INPUT' | 'DUPLICATE_CPF' | 'UNAUTHORIZED' }

export async function getClientes(options?: { includeIds?: string[] }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (role === 'GERENTE' || role === 'OPERADOR') {
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
  sort?: 'newest' | 'az'
  emailStatus?: 'filled' | 'missing'
  whatsappStatus?: 'filled' | 'missing'
  cpfStatus?: 'filled' | 'missing'
  inadimplente?: boolean
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
  const sort: 'newest' | 'az' = options?.sort === 'az' ? 'az' : 'newest'
  const emailStatus = options?.emailStatus
  const whatsappStatus = options?.whatsappStatus
  const cpfStatus = options?.cpfStatus
  const inadimplente = options?.inadimplente === true

  let where: Prisma.ClienteWhereInput | undefined

  if (role === 'GERENTE' || role === 'OPERADOR') {
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

  if (emailStatus === 'filled') {
    andConditions.push({ email: { not: null } }, { email: { not: '' } })
  } else if (emailStatus === 'missing') {
    andConditions.push({
      OR: [{ email: null }, { email: '' }],
    })
  }

  if (whatsappStatus === 'filled') {
    andConditions.push({ whatsapp: { not: null } }, { whatsapp: { not: '' } })
  } else if (whatsappStatus === 'missing') {
    andConditions.push({
      OR: [{ whatsapp: null }, { whatsapp: '' }],
    })
  }

  if (cpfStatus === 'filled') {
    andConditions.push({ cpf: { not: null } }, { cpf: { not: '' } })
  } else if (cpfStatus === 'missing') {
    andConditions.push({
      OR: [{ cpf: null }, { cpf: '' }],
    })
  }

  // Inadimplência é uma marcação manual do contrato; ela não altera o status
  // financeiro e nem depende da data de vencimento.
  if (inadimplente) {
    andConditions.push({
      loans: {
        some: {
          inadimplente: true,
        },
      },
    })
  }

  if (andConditions.length > 0) {
    where = where ? { AND: [where, ...andConditions] } : { AND: andConditions }
  }

  const orderBy =
    sort === 'az'
      ? ([{ nome: 'asc' as const }, { createdAt: 'desc' as const }] satisfies Prisma.ClienteOrderByWithRelationInput[])
      : ([{ createdAt: 'desc' as const }] satisfies Prisma.ClienteOrderByWithRelationInput[])

  const [items, total, totalWithEmail, totalWithWhatsapp, totalWithCpf, cities] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
    }),
    prisma.cliente.count({ where }),
    prisma.cliente.count({ where: { AND: [where ?? {}, { email: { not: null } }, { email: { not: '' } }] } }),
    prisma.cliente.count({ where: { AND: [where ?? {}, { whatsapp: { not: null } }, { whatsapp: { not: '' } }] } }),
    prisma.cliente.count({ where: { AND: [where ?? {}, { cpf: { not: null } }, { cpf: { not: '' } }] } }),
    prisma.cliente.findMany({
      where: { AND: [where ?? {}, { cidade: { not: null } }] },
      distinct: ['cidade'],
      select: { cidade: true },
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    sort,
    summary: {
      total,
      withEmail: totalWithEmail,
      withWhatsapp: totalWithWhatsapp,
      withCpf: totalWithCpf,
      cities: cities.filter((item) => item.cidade && item.cidade.trim() !== '').length,
    },
  }
}

export async function createCliente(data: ClienteInput) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteMutationResult
    }

    const normalizedData = normalizeClienteInput(data)
    validateClienteInput(normalizedData)
    await assertUniqueClienteCpf({
      cpf: normalizedData.cpf,
      actorRole: (session.user as any).role,
      actorUserId: (session.user as any).id,
    })

    const cliente = await prisma.cliente.create({
      data: normalizedData,
      select: { id: true },
    })

    revalidatePath('/clientes')
    return { ok: true, id: cliente.id } satisfies ClienteMutationResult
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return { ok: false, error: error.message, code: error.code } satisfies ClienteMutationResult
    }

    console.error('[clientes/createCliente] unexpected error', error)
    return { ok: false, error: 'Erro ao salvar cliente. Tente novamente.', code: 'INTERNAL_ERROR' } satisfies ClienteMutationResult
  }
}

export async function validateClienteCpf(
  cpf: string,
  options?: { currentClientId?: string }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteCpfValidationResult
    }

    if (options?.currentClientId) {
      return { ok: true } satisfies ClienteCpfValidationResult
    }

    await assertUniqueClienteCpf({
      cpf,
      actorRole: (session.user as any).role,
      actorUserId: (session.user as any).id,
    })

    return { ok: true } satisfies ClienteCpfValidationResult
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return { ok: false, error: error.message, code: error.code } satisfies ClienteCpfValidationResult
    }

    console.error('[clientes/validateClienteCpf] unexpected error', error)
    return { ok: false, error: 'Erro ao validar CPF. Tente novamente.', code: 'INVALID_INPUT' } satisfies ClienteCpfValidationResult
  }
}

export async function updateCliente(id: string, data: ClienteInput) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteMutationResult
    }

    const normalizedData = normalizeClienteInput(data)
    validateClienteInput(normalizedData)

    const cliente = await prisma.cliente.update({
      where: { id },
      data: normalizedData,
      select: { id: true },
    })

    revalidatePath('/clientes')
    return { ok: true, id: cliente.id } satisfies ClienteMutationResult
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return { ok: false, error: error.message, code: error.code } satisfies ClienteMutationResult
    }

    console.error('[clientes/updateCliente] unexpected error', error)
    return { ok: false, error: 'Erro ao salvar cliente. Tente novamente.', code: 'INTERNAL_ERROR' } satisfies ClienteMutationResult
  }
}

export async function deleteCliente(id: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteMutationResult
    }

    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (!isAdminRole(role) && role !== 'GERENTE') {
      return { ok: false, error: 'Apenas administradores podem excluir clientes.', code: 'FORBIDDEN' } satisfies ClienteMutationResult
    }

    if (role === 'GERENTE') {
      const clienteDaCarteira = await prisma.cliente.findFirst({
        where: { id, loans: { some: { usuarioId: userId } } },
        select: { id: true },
      })
      if (!clienteDaCarteira) {
        return { ok: false, error: 'Gerentes só podem excluir clientes da própria carteira.', code: 'FORBIDDEN' } satisfies ClienteMutationResult
      }
    }

    await prisma.cliente.delete({
      where: { id },
    })
    revalidatePath('/clientes')
    return { ok: true, id } satisfies ClienteMutationResult
  } catch (error) {
    console.error('[clientes/deleteCliente] unexpected error', error)
    return { ok: false, error: 'Erro ao excluir cliente. Verifique se há contratos ativos.', code: 'INTERNAL_ERROR' } satisfies ClienteMutationResult
  }
}

export async function archiveClienteAction(id: string, motivo?: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteMutationResult
    }

    const role = (session.user as any).role
    if (!isAdminRole(role)) {
      return { ok: false, error: 'Apenas administradores podem arquivar clientes.', code: 'FORBIDDEN' } satisfies ClienteMutationResult
    }

    await archiveCliente(id, { actorUserId: (session.user as any).id, motivo })
    revalidatePath('/clientes')
    revalidatePath('/arquivados')
    return { ok: true, id } satisfies ClienteMutationResult
  } catch (error) {
    if (error instanceof ArchiveError) {
      return { ok: false, error: error.message, code: error.code } satisfies ClienteMutationResult
    }
    console.error('[clientes/archiveClienteAction] unexpected error', error)
    return { ok: false, error: 'Erro ao arquivar cliente.', code: 'INTERNAL_ERROR' } satisfies ClienteMutationResult
  }
}

export async function unarchiveClienteAction(id: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' } satisfies ClienteMutationResult
    }

    const role = (session.user as any).role
    if (!isAdminRole(role)) {
      return { ok: false, error: 'Apenas administradores podem desarquivar clientes.', code: 'FORBIDDEN' } satisfies ClienteMutationResult
    }

    await unarchiveCliente(id, { actorUserId: (session.user as any).id })
    revalidatePath('/clientes')
    revalidatePath('/arquivados')
    return { ok: true, id } satisfies ClienteMutationResult
  } catch (error) {
    if (error instanceof ArchiveError) {
      return { ok: false, error: error.message, code: error.code } satisfies ClienteMutationResult
    }
    console.error('[clientes/unarchiveClienteAction] unexpected error', error)
    return { ok: false, error: 'Erro ao desarquivar cliente.', code: 'INTERNAL_ERROR' } satisfies ClienteMutationResult
  }
}
