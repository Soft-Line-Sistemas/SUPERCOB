'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getClientes() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  if (role === 'OPERADOR') {
    return await prisma.cliente.findMany({
      where: {
        loans: {
          some: { usuarioId: userId }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  return await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCliente(data: { nome: string; email: string; whatsapp: string }) {
  const cliente = await prisma.cliente.create({
    data,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function updateCliente(id: string, data: { nome: string; email: string; whatsapp: string }) {
  const cliente = await prisma.cliente.update({
    where: { id },
    data,
  })
  revalidatePath('/clientes')
  return cliente
}

export async function deleteCliente(id: string) {
  await prisma.cliente.delete({
    where: { id },
  })
  revalidatePath('/clientes')
}
