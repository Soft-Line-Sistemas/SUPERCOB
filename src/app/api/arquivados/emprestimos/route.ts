import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') ?? '15') || 15))
    const skip = (page - 1) * limit

    const where: any = {}
    if (q !== '') {
      where.OR = [{ observacao: { contains: q } }]
    }

    const [items, total] = await Promise.all([
      prisma.emprestimoArquivado.findMany({
        where,
        orderBy: { arquivadoEm: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          clienteId: true,
          valor: true,
          status: true,
          vencimento: true,
          quitadoEm: true,
          arquivadoEm: true,
          motivoArquivamento: true,
          clienteTambemArquivado: true,
          arquivadoPor: { select: { nome: true } },
          usuario: { select: { nome: true } },
        },
      }),
      prisma.emprestimoArquivado.count({ where }),
    ])

    // clienteId pode apontar para Cliente ativo (arquivamento individual) ou
    // ClienteArquivado (arquivamento em conjunto) — não há relation Prisma automática.
    const clienteIds = [...new Set(items.map((l) => l.clienteId))]
    const [ativos, arquivados] = clienteIds.length
      ? await Promise.all([
          prisma.cliente.findMany({ where: { id: { in: clienteIds } }, select: { id: true, nome: true } }),
          prisma.clienteArquivado.findMany({ where: { id: { in: clienteIds } }, select: { id: true, nome: true } }),
        ])
      : [[], []]
    const nomeById = new Map([...ativos, ...arquivados].map((c) => [c.id, c.nome]))

    return NextResponse.json({
      items: items.map((l) => ({ ...l, clienteNome: nomeById.get(l.clienteId) ?? '(cliente removido)' })),
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar contratos arquivados' }, { status: 500 })
  }
}
