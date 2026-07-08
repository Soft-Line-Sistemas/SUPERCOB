'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { isAdminRole } from '@/lib/admin-auth'
import { assertUniqueClienteCpf, type ClienteInput, normalizeClienteInput, validateClienteInput } from '@/lib/client-validation'

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

  const normalizedData = normalizeClienteInput(data)
  validateClienteInput(normalizedData)
  await assertUniqueClienteCpf({
    cpf: normalizedData.cpf,
    actorRole: (session.user as any).role,
    actorUserId: (session.user as any).id,
  })

  const cliente = await prisma.cliente.create({
    data: normalizedData,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function updateCliente(id: string, data: ClienteInput) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const normalizedData = normalizeClienteInput(data)
  validateClienteInput(normalizedData)
  await assertUniqueClienteCpf({
    cpf: normalizedData.cpf,
    currentClientId: id,
    actorRole: (session.user as any).role,
    actorUserId: (session.user as any).id,
  })

  const cliente = await prisma.cliente.update({
    where: { id },
    data: normalizedData,
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
