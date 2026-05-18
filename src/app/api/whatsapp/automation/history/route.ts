import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const emprestimoId = searchParams.get('emprestimoId') || undefined
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || '30')))
  const skip = (page - 1) * limit

  const where: any = {}
  if (emprestimoId) where.emprestimoId = emprestimoId

  const [items, total] = await Promise.all([
    prisma.whatsappAutomationDispatch.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        rule: { select: { key: true, title: true } },
        emprestimo: {
          select: {
            id: true,
            cliente: { select: { id: true, nome: true, whatsapp: true } },
          },
        },
      },
    }),
    prisma.whatsappAutomationDispatch.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  })
}
