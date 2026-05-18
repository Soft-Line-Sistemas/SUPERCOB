import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') || 'PENDING').toUpperCase()

  const items = await prisma.whatsappAutomationDispatch.findMany({
    where: {
      requiresManualFollowUp: true,
      followUpStatus: status,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      rule: { select: { key: true, title: true } },
      emprestimo: {
        select: {
          id: true,
          cliente: { select: { id: true, nome: true, whatsapp: true } },
        },
      },
    },
  })

  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = String(body.id || '')
  const action = String(body.action || 'RESOLVE').toUpperCase()
  const notes = body.notes ? String(body.notes) : null

  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  if (action !== 'RESOLVE' && action !== 'REOPEN') {
    return NextResponse.json({ error: 'action inválido' }, { status: 400 })
  }

  const updated = await prisma.whatsappAutomationDispatch.update({
    where: { id },
    data:
      action === 'RESOLVE'
        ? {
            requiresManualFollowUp: false,
            followUpStatus: 'RESOLVED',
            followUpResolvedAt: new Date(),
            followUpNotes: notes,
          }
        : {
            requiresManualFollowUp: true,
            followUpStatus: 'PENDING',
            followUpResolvedAt: null,
            followUpNotes: notes,
          },
  })

  return NextResponse.json(updated)
}
