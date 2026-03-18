import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

    const emprestimo = await prisma.emprestimo.update({
      where: { id: params.id },
      data: {
        ...data,
        status,
        quitadoEm: data.quitadoEm ? new Date(data.quitadoEm) : null,
      },
    })
    return NextResponse.json(emprestimo)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar empréstimo' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.emprestimo.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ message: 'Empréstimo excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir empréstimo' }, { status: 500 })
  }
}
