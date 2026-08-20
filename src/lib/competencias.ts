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

/**
 * Calcula a data de vencimento da N-ésima parcela a partir de uma data base.
 */
export function calculateParcelaDueDate(baseDate: Date | string, parcelaIndex1Based: number) {
  const base = new Date(baseDate)
  const dueDay = base.getUTCDate()
  const year = base.getUTCFullYear()
  const month = base.getUTCMonth() + parcelaIndex1Based

  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(dueDay, lastDayOfMonth), 12, 0, 0))
}

/**
 * Gera os dados de competências para um Acordo (Entrada opcional + N parcelas).
 */
export function buildAcordoCompetenciasData(input: {
  emprestimoId: string
  valorEntrada?: number | null
  vencimentoEntrada?: Date | string | null
  quantidadeParcelas: number
  valorParcela: number
  dataBaseParcelas: Date | string
}) {
  const competencias: Array<{
    emprestimoId: string
    vencimento: Date
    valorPrevisto: number
    tipo: 'ENTRADA' | 'PARCELA'
    numeroParcela: number
  }> = []

  const valorEntrada = Math.max(0, Number(input.valorEntrada ?? 0))
  if (valorEntrada > 0 && input.vencimentoEntrada) {
    const dEntrada = new Date(input.vencimentoEntrada)
    competencias.push({
      emprestimoId: input.emprestimoId,
      vencimento: new Date(Date.UTC(dEntrada.getUTCFullYear(), dEntrada.getUTCMonth(), dEntrada.getUTCDate(), 12, 0, 0)),
      valorPrevisto: valorEntrada,
      tipo: 'ENTRADA',
      numeroParcela: 0,
    })
  }

  const parcelas = Math.max(0, Number(input.quantidadeParcelas || 0))
  const valorParcela = Math.max(0, Number(input.valorParcela || 0))

  for (let i = 1; i <= parcelas; i++) {
    competencias.push({
      emprestimoId: input.emprestimoId,
      vencimento: calculateParcelaDueDate(input.dataBaseParcelas, i),
      valorPrevisto: valorParcela,
      tipo: 'PARCELA',
      numeroParcela: i,
    })
  }

  return competencias
}

