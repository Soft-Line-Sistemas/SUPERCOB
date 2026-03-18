import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const email = searchParams.get('email')
  const whatsapp = searchParams.get('whatsapp')

  const role = (session.user as any).role
  const userId = (session.user as any).id

  const where: any = role === 'OPERADOR' ? { usuarioId: userId } : {}

  if (status) where.status = status
  if (email || whatsapp) {
    where.cliente = {
      OR: [
        email ? { email: { contains: email } } : undefined,
        whatsapp ? { whatsapp: { contains: whatsapp } } : undefined,
      ].filter(Boolean),
    }
  }

  try {
    const emprestimos = await prisma.emprestimo.findMany({
      where,
      include: {
        cliente: true,
        usuario: { select: { nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(emprestimos)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar empréstimos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    
    let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
    if (data.quitadoEm) {
      status = 'QUITADO'
    } else if (data.observacao && data.observacao.trim() !== '') {
      status = 'NEGOCIACAO'
    }

    const emprestimo = await prisma.emprestimo.create({
      data: {
        ...data,
        status,
        quitadoEm: data.quitadoEm ? new Date(data.quitadoEm) : null,
      },
    })

    return NextResponse.json(emprestimo, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar empréstimo' }, { status: 500 })
  }
}
