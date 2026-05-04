type LoanInterestInput = {
  valor: number
  valorPago?: number | null
  jurosMes?: number | null
  jurosAtrasoDia?: number | null
  jurosPagos?: number | null
  vencimento?: Date | string | null
  createdAt?: Date | string | null
  now?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

const toUtcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

const monthId = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth()

export function calculateLoanInterest(input: LoanInterestInput) {
  const principalRestante = Math.max(Number(input.valor || 0) - Number(input.valorPago || 0), 0)
  const jurosPercent = Number(input.jurosMes ?? 0) || 0
  const jurosAtrasoPercent = Number(input.jurosAtrasoDia ?? 0) || 0
  const jurosPagos = Number(input.jurosPagos ?? 0) || 0
  const now = input.now ?? new Date()
  const baseDate = new Date((input.vencimento ?? input.createdAt ?? now) as any)

  if (principalRestante <= 0 || jurosPercent <= 0 || baseDate.getTime() > now.getTime()) {
    return {
      principalRestante,
      jurosBase: 0,
      jurosAcumuladoTotal: 0,
      jurosPendente: 0,
      totalDevido: principalRestante,
      monthsAccrued: 0,
      daysLate: 0,
      usesDailyLateInterest: jurosAtrasoPercent > 0,
    }
  }

  const jurosBase = principalRestante * (jurosPercent / 100)
  const daysLate = Math.max(0, Math.floor((toUtcDay(now) - toUtcDay(baseDate)) / DAY_MS))

  if (jurosAtrasoPercent > 0) {
    const jurosAcumuladoTotal = jurosBase * Math.pow(1 + jurosAtrasoPercent / 100, daysLate)
    const jurosPendente = Math.max(jurosAcumuladoTotal - jurosPagos, 0)

    return {
      principalRestante,
      jurosBase,
      jurosAcumuladoTotal,
      jurosPendente,
      totalDevido: principalRestante + jurosPendente,
      monthsAccrued: 0,
      daysLate,
      usesDailyLateInterest: true,
    }
  }

  const monthsAccrued = Math.max(1, monthId(now) - monthId(baseDate) + 1)
  const jurosAcumuladoTotal = jurosBase * monthsAccrued
  const jurosPendente = Math.max(jurosAcumuladoTotal - jurosPagos, 0)

  return {
    principalRestante,
    jurosBase,
    jurosAcumuladoTotal,
    jurosPendente,
    totalDevido: principalRestante + jurosPendente,
    monthsAccrued,
    daysLate,
    usesDailyLateInterest: false,
  }
}
