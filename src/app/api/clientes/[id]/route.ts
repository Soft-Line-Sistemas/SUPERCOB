import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const data = await req.json()
    const cliente = await prisma.cliente.update({
      where: { id },
      data,
    })
    return NextResponse.json(cliente)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await prisma.cliente.delete({
      where: { id },
    })
    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
