'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getChatUsers() {
  const session = await auth();
  if (!session?.user) throw new Error('Não autorizado');

  const { id, role } = session.user as any;

  if (role === 'ADMIN') {
    // Admin vê todos da Gerência
    return await prisma.usuario.findMany({
      where: { role: 'OPERADOR', isActive: true },
      select: { id: true, nome: true, email: true, role: true }
    });
  } else {
    // Gerência vê apenas os admins
    return await prisma.usuario.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, nome: true, email: true, role: true }
    });
  }
}

export async function getMessages(otherUserId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autorizado');

  const userId = (session.user as any).id;

  return await prisma.mensagemInterna.findMany({
    where: {
      OR: [
        // Mensagens entre eu e o outro usuário
        {
          AND: [
            { remetenteId: userId },
            { destinatarioId: otherUserId }
          ]
        },
        {
          AND: [
            { remetenteId: otherUserId },
            { destinatarioId: userId }
          ]
        },
        // Mensagens massivas (se eu for o destinatário ou se eu for o admin que enviou)
        {
          isMassiva: true,
          OR: [
            { remetenteId: userId }, // Eu enviei a mensagem massiva
            { destinatarioId: null } // Destinatário é nulo (global)
          ]
        }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: {
      remetente: { select: { nome: true, role: true } }
    }
  });
}

export async function sendMessage(destinatarioId: string, conteudo: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Não autorizado');

  const remetenteId = (session.user as any).id;

  const msg = await prisma.mensagemInterna.create({
    data: {
      conteudo,
      remetenteId,
      destinatarioId,
      isMassiva: false
    }
  });

  revalidatePath('/dashboard');
  return msg;
}

export async function sendMassMessage(conteudo: string) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    throw new Error('Apenas administradores podem enviar mensagens em massa');
  }

  const remetenteId = (session.user as any).id;

  const msg = await prisma.mensagemInterna.create({
    data: {
      conteudo,
      remetenteId,
      destinatarioId: null, // Global
      isMassiva: true
    }
  });

  revalidatePath('/dashboard');
  return msg;
}

export async function markAsRead(messageIds: string[]) {
  await prisma.mensagemInterna.updateMany({
    where: { id: { in: messageIds } },
    data: { isLida: true }
  });
}
