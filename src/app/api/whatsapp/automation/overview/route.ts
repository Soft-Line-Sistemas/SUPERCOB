import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

function nextRuleRun(sendTime: string) {
  const [h, m] = sendTime.split(':').map((v) => Number(v || 0))
  const now = new Date()
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureWhatsappAutomationSeed()

  const [config, recent, todayTotal, todaySent, todayFailed, openLoans, pendingFollowUps] = await Promise.all([
    prisma.whatsappAutomationConfig.findFirst({ include: { rules: { orderBy: { priority: 'asc' } } } }),
    prisma.whatsappAutomationDispatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        rule: { select: { id: true, title: true, key: true } },
        emprestimo: { select: { id: true, cliente: { select: { nome: true, whatsapp: true } } } },
      },
    }),
    prisma.whatsappAutomationDispatch.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.whatsappAutomationDispatch.count({
      where: {
        status: 'SENT',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.whatsappAutomationDispatch.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.emprestimo.count({ where: { status: { in: ['ABERTO', 'NEGOCIACAO'] }, cobrancaAtiva: true } }),
    prisma.whatsappAutomationDispatch.count({
      where: { requiresManualFollowUp: true, followUpStatus: 'PENDING' },
    }),
  ])

  if (!config) {
    return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
  }

  const situations = config.rules.map((rule) => ({
    id: rule.id,
    key: rule.key,
    title: rule.title,
    enabled: rule.enabled,
    triggerType: rule.triggerType,
    offsetDays: rule.offsetDays,
    recurrenceDays: rule.recurrenceDays,
    sendTime: rule.sendTime,
    nextRunAt: nextRuleRun(rule.sendTime),
  }))

  return NextResponse.json({
    summary: {
      automationEnabled: config.enabled,
      activeRules: config.rules.filter((r) => r.enabled).length,
      openLoans,
      todayTotal,
      todaySent,
      todayFailed,
      minIntervalMinutes: Math.max(1, Number(config.minIntervalMinutes || 1)),
      pendingFollowUps,
    },
    situations,
    recent,
  })
}
