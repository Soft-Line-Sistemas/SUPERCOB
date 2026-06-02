import { prisma } from '@/lib/prisma'

type QueueRule = {
  id: string
  key: string
  title: string
  enabled: boolean
  priority: number
  triggerType: string
  offsetDays: number
  recurrenceDays: number | null
  sendTime: string
}

type QueueLoan = {
  id: string
  clienteId: string
  valor: number
  valorPago: number
  vencimento: Date | null
  createdAt: Date
  status: string
  cobrancaAtiva: boolean
  cliente: {
    id: string
    nome: string
    whatsapp: string | null
    whatsappPrefs: Array<{
      enabled: boolean
      allowRecurrence: boolean
    }>
  }
}

type QueueDispatch = {
  ruleId: string
  emprestimoId: string
  createdAt: Date
  sentAt: Date | null
  emprestimo: {
    clienteId: string
  } | null
}

export type WhatsappAutomationQueueItem = {
  queuePosition: number
  clienteId: string
  clienteNome: string
  whatsapp: string | null
  emprestimoId: string
  contratoLabel: string
  ruleId: string
  ruleKey: string
  ruleTitle: string
  scheduledAt: Date
  scheduledAtLabel: string
  expectedAt: Date
  expectedAtLabel: string
  delayedByQueueMinutes: number
  overdueByMinutes: number
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number(part || 0))
  return hours * 60 + minutes
}

function getLocalWeekday(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date)
}

function getLocalDateParts(date: Date, timezone: string) {
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

function toLocalDateOnly(date: Date, timezone: string) {
  const parts = getLocalDateParts(date, timezone)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function getDateOnlyParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function isInQuietHours(currentMinutes: number, start: number, end: number) {
  if (start === end) return true
  if (start < end) return currentMinutes >= start && currentMinutes < end
  return currentMinutes >= start || currentMinutes < end
}

function getQuietMinutes(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function formatDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function makeDateAtMinutes(date: Date, minutes: number, timezone: string) {
  const dateParts = getDateOnlyParts(date)
  const hours = Math.floor(minutes / 60)
  const minute = minutes % 60
  const utcGuess = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minute, 0, 0))
  const guessParts = getLocalDateParts(utcGuess, timezone)
  const localGuessAsUtc = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    0,
    0,
  )

  return new Date(utcGuess.getTime() - (localGuessAsUtc - utcGuess.getTime()))
}

function getRuleBaseDate(loan: QueueLoan, rule: QueueRule, timezone: string) {
  const dueDate = toLocalDateOnly(loan.vencimento ?? loan.createdAt, timezone)
  if (rule.triggerType === 'PRE_DUE') return addDays(dueDate, rule.offsetDays)
  if (rule.triggerType === 'DUE') return dueDate
  if (rule.triggerType === 'LATE') return addDays(dueDate, Math.max(rule.offsetDays, 0))
  if (rule.triggerType === 'RECURRING') return addDays(dueDate, Math.max(rule.offsetDays, 0))
  return null
}

function isScheduleWindowAllowed(
  dateOnly: Date,
  rule: QueueRule,
  config: { timezone: string; sendOnWeekends: boolean; quietHoursStart: string | null; quietHoursEnd: string | null },
) {
  const weekday = getLocalWeekday(makeDateAtMinutes(dateOnly, 12 * 60, config.timezone), config.timezone)
  if (!config.sendOnWeekends && (weekday === 'Sat' || weekday === 'Sun')) return false

  const quietStart = getQuietMinutes(config.quietHoursStart)
  const quietEnd = getQuietMinutes(config.quietHoursEnd)
  if (quietStart != null && quietEnd != null) {
    const sendMinutes = parseTimeToMinutes(rule.sendTime)
    if (isInQuietHours(sendMinutes, quietStart, quietEnd)) return false
  }

  return true
}

function getNextCandidateForRule(
  loan: QueueLoan,
  rule: QueueRule,
  now: Date,
  config: { timezone: string; sendOnWeekends: boolean; quietHoursStart: string | null; quietHoursEnd: string | null },
  handledToday: Set<string>,
) {
  const baseDate = getRuleBaseDate(loan, rule, config.timezone)
  if (!baseDate) return null

  const today = toLocalDateOnly(now, config.timezone)
  const isTodayHandled = handledToday.has(`${rule.id}:${loan.id}`)
  const sendMinutes = parseTimeToMinutes(rule.sendTime)

  const evaluate = (candidateDate: Date) => {
    const candidateDay = toLocalDateOnly(candidateDate, config.timezone)
    if (candidateDay.getTime() < today.getTime()) return null
    if (candidateDay.getTime() === today.getTime() && isTodayHandled) return null
    if (!isScheduleWindowAllowed(candidateDay, rule, config)) return null
    return makeDateAtMinutes(candidateDay, sendMinutes, config.timezone)
  }

  if (rule.triggerType !== 'RECURRING') {
    return evaluate(baseDate)
  }

  const recurrenceDays = Math.max(rule.recurrenceDays || 1, 1)
  let cursor = new Date(baseDate)

  while (cursor.getTime() < today.getTime()) {
    cursor = addDays(cursor, recurrenceDays)
  }

  for (let attempts = 0; attempts < 24; attempts += 1) {
    const evaluated = evaluate(cursor)
    if (evaluated) return evaluated
    cursor = addDays(cursor, recurrenceDays)
  }

  return null
}

export function buildWhatsappAutomationQueue(params: {
  config: {
    timezone: string | null
    sendOnWeekends: boolean | null
    quietHoursStart: string | null
    quietHoursEnd: string | null
    minIntervalMinutes: number | null
    queueGapMinutes: number | null
    rules: QueueRule[]
  }
  loans: QueueLoan[]
  recentDispatches: QueueDispatch[]
  now?: Date
}) {
  const { config, loans, recentDispatches } = params
  const now = params.now ?? new Date()
  const timezone = config.timezone || 'America/Bahia'
  const queueConfig = {
    timezone,
    sendOnWeekends: Boolean(config.sendOnWeekends),
    quietHoursStart: config.quietHoursStart,
    quietHoursEnd: config.quietHoursEnd,
  }
  const today = toLocalDateOnly(now, timezone)
  const handledToday = new Set<string>(
    recentDispatches
      .filter((item) => item.createdAt && toLocalDateOnly(item.createdAt, timezone).getTime() === today.getTime())
      .map((item) => `${item.ruleId}:${item.emprestimoId}`),
  )

  const lastSentByClient = new Map<string, Date>()
  for (const item of recentDispatches) {
    const clienteId = item.emprestimo?.clienteId
    const sentAt = item.sentAt ?? null
    if (!clienteId || !sentAt || lastSentByClient.has(clienteId)) continue
    lastSentByClient.set(clienteId, sentAt)
  }

  const candidates = loans
    .map((loan) => {
      const whatsapp = (loan.cliente.whatsapp || '').replace(/\D/g, '')
      if (whatsapp.length < 10) return null

      const pref = loan.cliente.whatsappPrefs[0]
      if (pref && !pref.enabled) return null

      const eligibleRules = config.rules
        .filter((rule) => {
          if (rule.triggerType === 'RECURRING' && pref && !pref.allowRecurrence) return false
          return true
        })
        .map((rule) => ({
          rule,
          scheduledAt: getNextCandidateForRule(loan, rule, now, queueConfig, handledToday),
        }))
        .filter((item) => item.scheduledAt)
        .sort((a, b) => {
          const timeDiff = a.scheduledAt!.getTime() - b.scheduledAt!.getTime()
          if (timeDiff !== 0) return timeDiff
          return a.rule.priority - b.rule.priority
        })

      if (eligibleRules.length === 0) return null
      const nextRule = eligibleRules[0]

      return {
        emprestimoId: loan.id,
        clienteId: loan.clienteId,
        clienteNome: loan.cliente.nome,
        whatsapp: loan.cliente.whatsapp,
        ruleId: nextRule.rule.id,
        ruleKey: nextRule.rule.key,
        ruleTitle: nextRule.rule.title,
        priority: nextRule.rule.priority,
        scheduledAt: nextRule.scheduledAt!,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const timeDiff = a!.scheduledAt.getTime() - b!.scheduledAt.getTime()
      if (timeDiff !== 0) return timeDiff
      const priorityDiff = a!.priority - b!.priority
      if (priorityDiff !== 0) return priorityDiff
      return a!.clienteNome.localeCompare(b!.clienteNome, 'pt-BR')
    }) as Array<{
    emprestimoId: string
    clienteId: string
    clienteNome: string
    whatsapp: string | null
    ruleId: string
    ruleKey: string
    ruleTitle: string
    priority: number
    scheduledAt: Date
  }>

  const minIntervalMs = Math.max(1, Number(config.minIntervalMinutes || 1)) * 60 * 1000
  const queueGapMs = Math.max(0, Number(config.queueGapMinutes || 0)) * 60 * 1000
  const availabilityByClient = new Map<string, number>()
  for (const [clienteId, sentAt] of Array.from(lastSentByClient.entries())) {
    availabilityByClient.set(clienteId, sentAt.getTime() + minIntervalMs)
  }

  let nextGlobalAvailableAt = 0
  if (queueGapMs > 0) {
    const latestGlobalSent = recentDispatches.find((item) => item.sentAt)?.sentAt ?? null
    if (latestGlobalSent) {
      nextGlobalAvailableAt = latestGlobalSent.getTime() + queueGapMs
    }
  }

  const items: WhatsappAutomationQueueItem[] = candidates.map((item, index) => {
    const scheduledAtMs = item.scheduledAt.getTime()
    const availableAtMs = availabilityByClient.get(item.clienteId) ?? scheduledAtMs
    const queueReadyAtMs = Math.max(scheduledAtMs, availableAtMs, nextGlobalAvailableAt)
    const expectedAtMs = queueReadyAtMs
    availabilityByClient.set(item.clienteId, expectedAtMs + minIntervalMs)
    nextGlobalAvailableAt = queueGapMs > 0 ? expectedAtMs + queueGapMs : nextGlobalAvailableAt
    const expectedAt = new Date(expectedAtMs)

    return {
      queuePosition: index + 1,
      clienteId: item.clienteId,
      clienteNome: item.clienteNome,
      whatsapp: item.whatsapp,
      emprestimoId: item.emprestimoId,
      contratoLabel: `CTR-${item.emprestimoId.slice(-6).toUpperCase()}`,
      ruleId: item.ruleId,
      ruleKey: item.ruleKey,
      ruleTitle: item.ruleTitle,
      scheduledAt: item.scheduledAt,
      scheduledAtLabel: formatDateTime(item.scheduledAt, timezone),
      expectedAt,
      expectedAtLabel: formatDateTime(expectedAt, timezone),
      delayedByQueueMinutes: Math.max(0, Math.round((queueReadyAtMs - scheduledAtMs) / 60000)),
      overdueByMinutes: Math.max(0, Math.round((now.getTime() - expectedAtMs) / 60000)),
    }
  })

  return {
    generatedAt: now,
    generatedAtLabel: formatDateTime(now, timezone),
    summary: {
      total: items.length,
      timezone,
      minIntervalMinutes: Math.max(1, Number(config.minIntervalMinutes || 1)),
      queueGapMinutes: Math.max(0, Number(config.queueGapMinutes || 0)),
    },
    items,
  }
}

export async function loadWhatsappAutomationQueue(now = new Date()) {
  const [config, loans, recentDispatches] = await Promise.all([
    prisma.whatsappAutomationConfig.findFirst({
      include: {
        rules: {
          where: { enabled: true },
          orderBy: [{ priority: 'asc' }, { sendTime: 'asc' }],
        },
      },
    }),
    prisma.emprestimo.findMany({
      where: {
        status: { in: ['ABERTO', 'NEGOCIACAO'] },
        cobrancaAtiva: true,
      },
      include: {
        cliente: {
          include: {
            whatsappPrefs: {
              select: {
                enabled: true,
                allowRecurrence: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ vencimento: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.whatsappAutomationDispatch.findMany({
      where: {
        OR: [{ status: 'SENT' }, { status: 'PENDING' }],
      },
      select: {
        ruleId: true,
        emprestimoId: true,
        createdAt: true,
        sentAt: true,
        emprestimo: {
          select: {
            clienteId: true,
          },
        },
      },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  if (!config) return null
  return buildWhatsappAutomationQueue({ config, loans, recentDispatches, now })
}
