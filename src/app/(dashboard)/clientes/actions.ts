'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

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
}

export async function getClientes(options?: { includeIds?: string[] }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (role === 'OPERADOR') {
    const includeIds = (options?.includeIds ?? []).filter((id) => typeof id === 'string' && id.trim() !== '')
    return await prisma.cliente.findMany({
      where: {
        OR: [
          { loans: { some: { usuarioId: userId } } },
          includeIds.length > 0 ? { id: { in: includeIds } } : undefined,
        ].filter(Boolean),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  return await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCliente(data: ClienteInput) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const cliente = await prisma.cliente.create({
    data,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function updateCliente(id: string, data: ClienteInput) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

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

  await prisma.cliente.delete({
    where: { id },
  })
  revalidatePath('/clientes')
}
