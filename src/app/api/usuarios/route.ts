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

export async function GET() {
  try {
    await checkAdmin()
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await checkAdmin()
    const data = await req.json()
    
    if (!data.senha || data.senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const hashedSenha = await bcrypt.hash(data.senha, 10)
    
    const usuario = await prisma.usuario.create({
      data: {
        ...data,
        senha: hashedSenha,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
      }
    })

    return NextResponse.json(usuario, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
