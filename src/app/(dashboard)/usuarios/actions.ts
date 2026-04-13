'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logSystemAction } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'

async function checkPermission() {
  const session = await auth()
  const role = session?.user?.role?.toUpperCase()
  if (role !== 'ADM' && role !== 'ADMIN' && role !== 'ESCRITORIO') {
    throw new Error('Acesso negado. Apenas ADM ou Escritório podem gerenciar usuários.')
  }
  return session
}

export async function getUsuarios() {
  const session = await checkPermission()
  const role = session?.user?.role

  return await prisma.usuario.findMany({
    where: role === 'ESCRITORIO' ? { role: { in: ['ESCRITORIO', 'GERENTE'] } } : {},
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

export async function createUsuario(data: { nome: string; email: string; senha: string; role: string }) {
  const session = await checkPermission()
  const myRole = session?.user?.role

  // Regra 4: Escritório só pode criar Gerente ou Escritório
  if (myRole === 'ESCRITORIO' && data.role === 'ADM') {
    throw new Error('Escritório não pode criar usuários ADM.')
  }

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

export async function updateUsuario(id: string, data: { nome: string; email: string; senha?: string; role: string }) {
  const session = await checkPermission()
  const myRole = session?.user?.role

  const before = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true },
  })

  if (!before) throw new Error('Usuário não encontrado.')

  // Restrições de Escritório
  if (myRole === 'ESCRITORIO') {
    if (before.role === 'ADM' || data.role === 'ADM') {
      throw new Error('Escritório não tem permissão para gerenciar usuários ADM.')
    }
  }

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

  if (before && before.role !== usuario.role) {
    await logSystemAction({
      entidade: 'USUARIO',
      entidadeId: usuario.id,
      acao: 'UPDATE',
      detalhes: `Cargo alterado de ${before.role} para ${usuario.role}.`,
      antes: before,
      depois: usuario
    })
  }

  revalidatePath('/usuarios')
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
}

export async function deleteUsuario(id: string) {
  const session = await checkPermission()
  const myRole = session?.user?.role

  if (session?.user?.id === id) {
    throw new Error('Você não pode excluir seu próprio usuário.')
  }

  const target = await prisma.usuario.findUnique({ where: { id }, select: { role: true } })
  if (myRole === 'ESCRITORIO' && target?.role === 'ADM') {
    throw new Error('Escritório não pode excluir usuários ADM.')
  }
  
  await prisma.usuario.delete({
    where: { id },
  })
  revalidatePath('/usuarios')
}
