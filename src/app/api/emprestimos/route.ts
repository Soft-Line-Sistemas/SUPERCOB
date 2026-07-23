import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/admin-auth'

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
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String((session.user as any).role || '').toUpperCase()
  if (role === 'OPERADOR') {
    return NextResponse.json({ error: 'Operadores não podem criar contratos' }, { status: 403 })
  }

  try {
    const data = await req.json()
    
    let status: 'ABERTO' | 'NEGOCIACAO' | 'QUITADO' = 'ABERTO'
    if (data.quitadoEm) {
      status = 'QUITADO'
    } else if (data.observacao && data.observacao.trim() !== '') {
      status = 'NEGOCIACAO'
    }

    if (status === 'QUITADO' && !isAdminRole(role) && role !== 'GERENTE') {
      return NextResponse.json({ error: 'Apenas administradores ou gerentes podem concluir contratos' }, { status: 403 })
    }

    const emprestimo = await prisma.emprestimo.create({
      data: {
        ...data,
        usuarioId: role === 'GERENTE' ? (session.user as any).id : data.usuarioId,
        status,
        quitadoEm: data.quitadoEm ? new Date(data.quitadoEm) : null,
      },
    })

    return NextResponse.json(emprestimo, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
