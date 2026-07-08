import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { isAdminRole } from '@/lib/admin-auth'
import { assertUniqueClienteCpf, ClientValidationError, normalizeClienteInput, validateClienteInput } from '@/lib/client-validation'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const data = normalizeClienteInput(await req.json())
    validateClienteInput(data)
    await assertUniqueClienteCpf({
      cpf: data.cpf,
      currentClientId: id,
      actorRole: session.user.role,
      actorUserId: (session.user as any).id,
    })
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

  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
