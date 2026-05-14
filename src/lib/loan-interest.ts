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
  const principalBaseJuros = principalRestante > 0 ? principalRestante : Math.max(Number(input.valor || 0), 0)
  const jurosPercent = Number(input.jurosMes ?? 0) || 0
  const jurosAtrasoPercent = Number(input.jurosAtrasoDia ?? 0) || 0
  const jurosPagos = Number(input.jurosPagos ?? 0) || 0
  const now = input.now ?? new Date()
  const baseDate = new Date((input.vencimento ?? input.createdAt ?? now) as any)

  const jurosBase = principalBaseJuros * (jurosPercent / 100)

  if (jurosPercent <= 0 || baseDate.getTime() > now.getTime()) {
    return {
      principalRestante,
      jurosBase,
      jurosAcumuladoTotal: 0,
      jurosPendente: 0,
      totalDevido: principalRestante,
      monthsAccrued: 0,
      daysLate: 0,
      usesDailyLateInterest: jurosAtrasoPercent > 0,
      nextMonthInterest: jurosBase,
    }
  }

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
      nextMonthInterest: (principalRestante + jurosPendente) * (jurosAtrasoPercent / 100), // Diário
    }
  }

  // Capitalização Mensal (Juros Compostos)
  const monthsAccrued = Math.max(1, monthId(now) - monthId(baseDate) + 1)
  
  // Fórmula de Juros Compostos: M = P * (1 + i)^n
  // Juros = M - P
  const totalWithInterest = principalBaseJuros * Math.pow(1 + jurosPercent / 100, monthsAccrued)
  const jurosAcumuladoTotal = totalWithInterest - principalBaseJuros
  
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
    nextMonthInterest: (principalRestante + jurosPendente) * (jurosPercent / 100),
  }
}
