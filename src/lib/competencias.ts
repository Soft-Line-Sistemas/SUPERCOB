/**
 * Gera as competências exibidas no terminal a partir do mês de referência.
 * Nunca antecipa uma cobrança para antes do primeiro vencimento contratado.
 */
export function suggestedCompetenciaDates(
  firstDue: Date | string | null | undefined,
  referenceDate = new Date(),
  offsets: readonly number[] = [-1, 0, 1],
) {
  if (!firstDue) return []

  const first = new Date(firstDue)
  if (Number.isNaN(first.getTime())) return []

  const dueDay = first.getUTCDate()
  const firstCalendarDate = new Date(Date.UTC(
    first.getUTCFullYear(),
    first.getUTCMonth(),
    dueDay,
  ))

  return offsets
    .map((offset) => {
      const year = referenceDate.getUTCFullYear()
      const month = referenceDate.getUTCMonth() + offset
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      return new Date(Date.UTC(year, month, Math.min(dueDay, lastDayOfMonth)))
    })
    .filter((date) => date >= firstCalendarDate)
}
