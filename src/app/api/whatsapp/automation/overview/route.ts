import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

function getTzParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(byType.year || 0),
    month: Number(byType.month || 1),
    day: Number(byType.day || 1),
    hour: Number(byType.hour || 0),
    minute: Number(byType.minute || 0),
  }
}

function nextRuleRun(sendTime: string, timezone: string) {
  const [h, m] = sendTime.split(':').map((v) => Number(v || 0))
  const now = new Date()
  const nowParts = getTzParts(now, timezone)
  const nowMinutes = nowParts.hour * 60 + nowParts.minute
  const sendMinutes = h * 60 + m
  const baseDate = nowMinutes >= sendMinutes ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now
  const dateParts = getTzParts(baseDate, timezone)
  const dd = String(dateParts.day).padStart(2, '0')
  const mm = String(dateParts.month).padStart(2, '0')
  const yyyy = String(dateParts.year)
  const nextRunAtLabel = `${dd}/${mm}/${yyyy}, ${sendTime}:00`

  return {
    // Mantido por compatibilidade; frontend passa a priorizar nextRunAtLabel.
    nextRunAt: new Date(baseDate),
    nextRunAtLabel,
  }
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

  const timezone = config.timezone || 'America/Bahia'
  const situations = config.rules.map((rule) => {
    const nextRun = nextRuleRun(rule.sendTime, timezone)
    return {
      id: rule.id,
      key: rule.key,
      title: rule.title,
      enabled: rule.enabled,
      triggerType: rule.triggerType,
      offsetDays: rule.offsetDays,
      recurrenceDays: rule.recurrenceDays,
      sendTime: rule.sendTime,
      nextRunAt: nextRun.nextRunAt,
      nextRunAtLabel: nextRun.nextRunAtLabel,
    }
  })

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
