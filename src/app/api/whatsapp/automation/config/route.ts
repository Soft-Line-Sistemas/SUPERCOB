import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ensureWhatsappAutomationSeed } from '@/lib/whatsapp-automation'
import { isAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureWhatsappAutomationSeed()
  const config = await prisma.whatsappAutomationConfig.findFirst({
    include: { rules: { orderBy: { priority: 'asc' } } },
  })

  return NextResponse.json(config)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  await ensureWhatsappAutomationSeed()

  const config = await prisma.whatsappAutomationConfig.findFirst({
    include: { rules: true },
  })

  if (!config) {
    return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.whatsappAutomationConfig.update({
      where: { id: config.id },
      data: {
        enabled: Boolean(body.enabled),
        defaultCountryCode: String(body.defaultCountryCode || '55'),
        timezone: String(body.timezone || 'America/Bahia'),
        quietHoursStart: body.quietHoursStart ? String(body.quietHoursStart) : null,
        quietHoursEnd: body.quietHoursEnd ? String(body.quietHoursEnd) : null,
        sendOnWeekends: Boolean(body.sendOnWeekends),
        minIntervalMinutes: Math.max(1, Number(body.minIntervalMinutes ?? 240)),
      },
    })

    const incomingRules = Array.isArray(body.rules) ? body.rules : []
    for (const rule of incomingRules) {
      if (!rule?.id) continue
      await tx.whatsappAutomationRule.update({
        where: { id: String(rule.id) },
        data: {
          title: String(rule.title || ''),
          enabled: Boolean(rule.enabled),
          priority: Number(rule.priority || 100),
          triggerType: String(rule.triggerType || 'LATE'),
          offsetDays: Number(rule.offsetDays || 0),
          recurrenceDays: rule.recurrenceDays == null ? null : Number(rule.recurrenceDays),
          sendTime: String(rule.sendTime || '09:00'),
          template: String(rule.template || ''),
        },
      })
    }

    return tx.whatsappAutomationConfig.findUnique({
      where: { id: config.id },
      include: { rules: { orderBy: { priority: 'asc' } } },
    })
  })

  return NextResponse.json(updated)
}
