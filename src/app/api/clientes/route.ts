import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') ?? '30') || 30))
    const skip = (page - 1) * limit

    const where: any = {}
    if (q !== '') {
      const digits = q.replace(/\D/g, '')
      if (q.length < 3 && digits.length < 3) {
        return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false })
      }
      where.OR = [
        { nome: { contains: q } },
        digits ? { whatsapp: { startsWith: digits } } : undefined,
        digits ? { cpf: { startsWith: digits } } : undefined,
      ].filter(Boolean)
    }

    const orderBy = q !== '' ? { nome: 'asc' as const } : { createdAt: 'desc' as const }

    const [items, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: { id: true, nome: true, email: true, whatsapp: true, cpf: true, createdAt: true },
      }),
      prisma.cliente.count({ where }),
    ])

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const cliente = await prisma.cliente.create({ data })
    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}
