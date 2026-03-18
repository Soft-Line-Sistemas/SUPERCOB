'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'

async function checkAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Acesso negado. Apenas administradores podem gerenciar usuários.')
  }
}

export async function getUsuarios() {
  await checkAdmin()
  return await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUsuario(data: { nome: string; email: string; senha: string; role: 'ADMIN' | 'OPERADOR' }) {
  await checkAdmin()
  const hashedSenha = await bcrypt.hash(data.senha, 10)
  const usuario = await prisma.usuario.create({
    data: {
      ...data,
      senha: hashedSenha,
    },
  })
  revalidatePath('/usuarios')
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
}

export async function updateUsuario(id: string, data: { nome: string; email: string; senha?: string; role: 'ADMIN' | 'OPERADOR' }) {
  await checkAdmin()
  const updateData: any = {
    nome: data.nome,
    email: data.email,
    role: data.role,
  }

  if (data.senha && data.senha.trim() !== '') {
    updateData.senha = await bcrypt.hash(data.senha, 10)
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: updateData,
  })
  revalidatePath('/usuarios')
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
}

export async function deleteUsuario(id: string) {
  await checkAdmin()
  const session = await auth()
  if (session?.user?.id === id) {
    throw new Error('Você não pode excluir seu próprio usuário.')
  }
  
  await prisma.usuario.delete({
    where: { id },
  })
  revalidatePath('/usuarios')
}
