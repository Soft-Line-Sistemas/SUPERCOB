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
      const digits = q.replace(/\D/g, '')
      where.OR = [
        { nome: { contains: q } },
        digits ? { whatsapp: { startsWith: digits } } : undefined,
        digits ? { cpf: { startsWith: digits } } : undefined,
      ].filter(Boolean)
    }

    const [items, total] = await Promise.all([
      prisma.clienteArquivado.findMany({
        where,
        orderBy: { arquivadoEm: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          cpf: true,
          whatsapp: true,
          arquivadoEm: true,
          motivoArquivamento: true,
          arquivadoPor: { select: { nome: true } },
          _count: { select: { documentos: true } },
        },
      }),
      prisma.clienteArquivado.count({ where }),
    ])

    const clienteIds = items.map((c) => c.id)
    const loanCounts = clienteIds.length
      ? await prisma.emprestimoArquivado.groupBy({
          by: ['clienteId'],
          where: { clienteId: { in: clienteIds } },
          _count: { _all: true },
        })
      : []
    const loanCountById = new Map(loanCounts.map((l) => [l.clienteId, l._count._all]))

    return NextResponse.json({
      items: items.map((c) => ({ ...c, totalContratosArquivados: loanCountById.get(c.id) ?? 0 })),
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes arquivados' }, { status: 500 })
  }
}
