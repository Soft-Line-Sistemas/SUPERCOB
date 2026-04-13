'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function globalSearch(query: string) {
  const session = await auth()
  if (!session?.user) return []

  if (!query || query.length < 2) return []

  const clients = await prisma.cliente.findMany({
    where: {
      OR: [
        { nome: { contains: query } },
        { email: { contains: query } },
        { cpf: { contains: query } },
        { whatsapp: { contains: query } },
      ]
    },
    take: 5,
    select: { id: true, nome: true, email: true, cpf: true }
  })

  const loans = await prisma.emprestimo.findMany({
    where: {
      id: { contains: query }
    },
    take: 5,
    include: { cliente: { select: { nome: true } } }
  })

  const items = [
    ...clients.map(c => ({
      id: `client-${c.id}`,
      title: c.nome,
      subtitle: `Cliente • ${c.email || c.cpf || 'Sem contato'}`,
      icon: 'user',
      category: 'Clientes Encontrados',
      url: `/clientes/${c.id}` // Direct link to client profile
    })),
    ...loans.map(l => ({
      id: `loan-${l.id}`,
      title: `Contrato ${l.id.slice(0, 8).toUpperCase()}`,
      subtitle: `Cobrança • ${l.cliente.nome}`,
      icon: 'receipt',
      category: 'Contratos Encontrados',
      url: `/emprestimos/${l.id}` // Direct link to loan management
    }))
  ]

  return items
}
