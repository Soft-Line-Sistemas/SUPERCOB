import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

async function checkAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await checkAdmin()
    const data = await req.json()
    
    const updateData: any = {
      nome: data.nome,
      email: data.email,
      role: data.role,
    }

    if (data.senha && data.senha.trim() !== '') {
      updateData.senha = await bcrypt.hash(data.senha, 10)
    }

    const usuario = await prisma.usuario.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
      }
    })
    return NextResponse.json(usuario)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
    
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 400 })
    }

    await prisma.usuario.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ message: 'Usuário excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
