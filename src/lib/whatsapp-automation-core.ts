import { calculateEstimatedMonthlyPayment } from './installments'
import { calculateLoanInterest } from './loan-interest'

export const DEFAULT_RULES = [
  {
    key: 'PRE_DUE_3D',
    title: 'Lembrete 3 dias antes',
    triggerType: 'PRE_DUE' as const,
    offsetDays: -3,
    recurrenceDays: null,
    sendTime: '09:00',
    priority: 10,
    template:
      'Olá {cliente_nome}, passando para lembrar que o vencimento do contrato {contrato_id} será em {data_vencimento}. Valor atual: {saldo}.',
  },
  {
    key: 'DUE_TODAY',
    title: 'Cobrança no vencimento',
    triggerType: 'DUE' as const,
    offsetDays: 0,
    recurrenceDays: null,
    sendTime: '09:30',
    priority: 20,
    template:
      'Olá {cliente_nome}, seu contrato {contrato_id} vence hoje ({data_vencimento}). Valor em aberto: {saldo}.',
  },
  {
    key: 'LATE_1D',
    title: 'Atraso 1 dia',
    triggerType: 'LATE' as const,
    offsetDays: 1,
    recurrenceDays: null,
    sendTime: '10:00',
    priority: 30,
    template:
      'Olá {cliente_nome}, identificamos atraso de {dias_atraso} dia no contrato {contrato_id}. Saldo pendente: {saldo}.',
  },
  {
    key: 'LATE_7D',
    title: 'Atraso 7 dias',
    triggerType: 'LATE' as const,
    offsetDays: 7,
    recurrenceDays: null,
    sendTime: '10:30',
    priority: 40,
    template:
      'Olá {cliente_nome}, o contrato {contrato_id} está com {dias_atraso} dias de atraso. Valor atualizado: {saldo}.',
  },
  {
    key: 'LATE_RECURRING',
    title: 'Recorrência de atraso',
    triggerType: 'RECURRING' as const,
    offsetDays: 2,
    recurrenceDays: 2,
    sendTime: '11:00',
    priority: 50,
    template:
      'Olá {cliente_nome}, seguimos aguardando regularização do contrato {contrato_id}. Saldo atual: {saldo}.',
  },
] as const

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(date: Date | null | undefined) {
  if (!date) return '-'
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function diffDaysUTC(from: Date, to: Date) {
  const a = toDateOnly(from).getTime()
  const b = toDateOnly(to).getTime()
  return Math.floor((b - a) / 86400000)
}

export function computeLoanFacts(loan: {
  id: string
  valor: number
  valorPago: number
  jurosMes: number
  jurosAtrasoDia: number
  vencimento: Date | null
  createdAt: Date
  status: string
  cliente: { nome: string; whatsapp: string | null }
}) {
  const baseDate = loan.vencimento ?? loan.createdAt
  const now = new Date()
  const daysFromDue = diffDaysUTC(baseDate, now)
  const daysLate = Math.max(daysFromDue, 0)
  const principal = Number(loan.valor || 0)
  const paid = Number(loan.valorPago || 0)
  const saldo = Math.max(principal - paid, 0)

  return {
    dueDate: baseDate,
    daysFromDue,
    daysLate,
    principal,
    paid,
    saldo,
    isClosed: loan.status === 'QUITADO' || loan.status === 'CANCELADO',
    hasValidWhatsapp: (loan.cliente.whatsapp || '').replace(/\D/g, '').length >= 10,
  }
}

type InstallmentProgressLoan = {
  valor: number
  valorPago: number
  jurosMes: number
  jurosAtrasoDia: number
  jurosPagos?: number | null
  quantidadeParcelas?: number | null
  status: string
  createdAt?: Date
  vencimento?: Date | null
  historico?: Array<{ createdAt: Date | string; descricao?: string | null }>
}

function parsePaymentAmountFromDescription(value?: string | null) {
  if (!value) return 0
  const match = value.match(/R\$\s*([\d.]+,\d{2})/)
  if (!match) return 0
  return Number(match[1].replace(/\./g, '').replace(',', '.')) || 0
}

function getMonthlyChargeAmount(loan: InstallmentProgressLoan) {
  return (
    calculateEstimatedMonthlyPayment({
      valor: loan.valor,
      jurosMes: loan.jurosMes,
      quantidadeParcelas: loan.quantidadeParcelas,
    }) ?? calculateLoanInterest(loan).jurosBase
  )
}

function getSettledMonthCount(loan: InstallmentProgressLoan) {
  const monthlyAmount = getMonthlyChargeAmount(loan)
  if (monthlyAmount <= 0) return 0

  const paidByMonth = new Map<string, number>()
  for (const entry of loan.historico || []) {
    const createdAt = new Date(entry.createdAt)
    const key = `${createdAt.getUTCFullYear()}-${createdAt.getUTCMonth()}`
    paidByMonth.set(key, (paidByMonth.get(key) || 0) + parsePaymentAmountFromDescription(entry.descricao))
  }

  let settledMonths = 0
  for (const paid of paidByMonth.values()) {
    if (paid + 0.01 >= monthlyAmount) settledMonths += 1
  }

  return settledMonths
}

export function getInstallmentProgressLabel(loan: InstallmentProgressLoan) {
  const total = Number(loan.quantidadeParcelas || 0)
  if (!Number.isInteger(total) || total <= 0) return '-'

  if (loan.status === 'QUITADO') {
    return `${total} de ${total}`
  }

  const current = Math.min(total, getSettledMonthCount(loan) + 1)
  return `${current} de ${total}`
}

export function renderTemplate(template: string, ctx: {
  clienteNome: string
  contratoId: string
  valor: number
  valorPago: number
  saldo: number
  jurosMes: number
  jurosAtrasoDia: number
  diasAtraso: number
  dataVencimento: Date | null
  parcela: string
}) {
  const replacements: Record<string, string> = {
    '{cliente_nome}': ctx.clienteNome,
    '{contrato_id}': ctx.contratoId,
    '{valor}': formatCurrencyBRL(ctx.valor),
    '{valor_pago}': formatCurrencyBRL(ctx.valorPago),
    '{saldo}': formatCurrencyBRL(ctx.saldo),
    '{juros_mes}': `${ctx.jurosMes.toFixed(2).replace('.', ',')}%`,
    '{juros_atraso_dia}': `${ctx.jurosAtrasoDia.toFixed(2).replace('.', ',')}%`,
    '{dias_atraso}': String(ctx.diasAtraso),
    '{data_vencimento}': formatDateBR(ctx.dataVencimento),
    '{parcela}': ctx.parcela,
  }

  let output = template
  for (const [tag, value] of Object.entries(replacements)) {
    output = output.split(tag).join(value)
  }
  return output
}

export type AutomationRuleLike = {
  triggerType: string
  offsetDays: number
  recurrenceDays: number | null
}

export function isRuleMatch(
  rule: AutomationRuleLike,
  facts: ReturnType<typeof computeLoanFacts>,
) {
  if (facts.isClosed || !facts.hasValidWhatsapp || facts.saldo <= 0) return false

  if (rule.triggerType === 'PRE_DUE') {
    return facts.daysFromDue === rule.offsetDays
  }

  if (rule.triggerType === 'DUE') {
    return facts.daysFromDue === 0
  }

  if (rule.triggerType === 'LATE') {
    return facts.daysLate === Math.max(rule.offsetDays, 0)
  }

  if (rule.triggerType === 'RECURRING') {
    const startDay = Math.max(rule.offsetDays, 0)
    if (facts.daysLate < startDay) return false
    const rec = Math.max(rule.recurrenceDays || 1, 1)
    return (facts.daysLate - startDay) % rec === 0
  }

  return false
}

export type AutomationWindowConfigLike = {
  timezone?: string | null
  sendOnWeekends?: boolean | null
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
}

export type AutomationWindowRuleLike = {
  sendTime?: string | null
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function getTimeZoneParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    weekday: byType.weekday,
    minutes: Number(byType.hour || 0) * 60 + Number(byType.minute || 0),
  }
}

function isInQuietHours(currentMinutes: number, start: number, end: number) {
  if (start === end) return true
  if (start < end) return currentMinutes >= start && currentMinutes < end
  return currentMinutes >= start || currentMinutes < end
}

export function validateAutomationWindow(
  config: AutomationWindowConfigLike,
  rule: AutomationWindowRuleLike,
  now = new Date(),
) {
  const timezone = config.timezone || 'America/Bahia'
  const local = getTimeZoneParts(now, timezone)

  if (!config.sendOnWeekends && (local.weekday === 'Sat' || local.weekday === 'Sun')) {
    return { ok: false, reason: 'Envio bloqueado em finais de semana.' }
  }

  const quietStart = parseTimeToMinutes(config.quietHoursStart)
  const quietEnd = parseTimeToMinutes(config.quietHoursEnd)
  if (quietStart != null && quietEnd != null && isInQuietHours(local.minutes, quietStart, quietEnd)) {
    return { ok: false, reason: 'Envio bloqueado pelo horário silencioso.' }
  }

  const sendAt = parseTimeToMinutes(rule.sendTime)
  if (sendAt != null && local.minutes < sendAt) {
    return { ok: false, reason: `Regra programada para ${rule.sendTime}.` }
  }

  return { ok: true, reason: null }
}
