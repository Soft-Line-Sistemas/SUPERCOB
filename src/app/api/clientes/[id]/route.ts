import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/admin-auth'
import { ClientValidationError, normalizeClienteInput, validateClienteInput } from '@/lib/client-validation'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const data = normalizeClienteInput(await req.json())
    validateClienteInput(data)
    const cliente = await prisma.cliente.update({
      where: { id },
      data,
    })
    return NextResponse.json(cliente)
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'DUPLICATE_CPF' ? 409 : 400 },
      )
    }
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id
  if (!isAdminRole(role) && role !== 'GERENTE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    if (role === 'GERENTE') {
      const clienteDaCarteira = await prisma.cliente.findFirst({
        where: { id, loans: { some: { usuarioId: userId } } },
        select: { id: true },
      })
      if (!clienteDaCarteira) {
        return NextResponse.json({ error: 'Gerentes só podem excluir clientes da própria carteira' }, { status: 403 })
      }
    }
    await prisma.cliente.delete({
      where: { id },
    })
    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
