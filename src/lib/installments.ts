export function calculateEstimatedInstallments(input: {
  valor?: number | null
  jurosMes?: number | null
  jurosTotalPercentualEsperado?: number | null
}) {
  const valor = Number(input.valor ?? 0)
  const jurosMes = Number(input.jurosMes ?? 0)
  const jurosTotalPercentualEsperado = Number(input.jurosTotalPercentualEsperado ?? 100)

  if (!Number.isFinite(valor) || valor <= 0) return null
  if (!Number.isFinite(jurosMes) || jurosMes <= 0) return null
  if (!Number.isFinite(jurosTotalPercentualEsperado) || jurosTotalPercentualEsperado <= 0) return null

  const monthlyPayment = valor * (jurosMes / 100)
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return null

  const totalExpectedInterest = valor * (jurosTotalPercentualEsperado / 100)
  return Math.max(1, Math.ceil(totalExpectedInterest / monthlyPayment))
}

export function calculateEstimatedMonthlyPayment(input: {
  valor?: number | null
  jurosMes?: number | null
  quantidadeParcelas?: number | null
}) {
  const valor = Number(input.valor ?? 0)
  const jurosMes = Number(input.jurosMes ?? 0)
  const quantidadeParcelas = Number(input.quantidadeParcelas ?? 0)

  if (!Number.isFinite(valor) || valor <= 0) return null
  if (!Number.isFinite(jurosMes) || jurosMes < 0) return null
  if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas <= 0) return null

  const jurosDoMes = valor * (jurosMes / 100)
  const amortizacaoPrincipal = valor / quantidadeParcelas
  const monthlyPayment = jurosDoMes + amortizacaoPrincipal
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return null

  return monthlyPayment
}

export function calculateCurrentInstallment(input: {
  valor?: number | null
  valorPago?: number | null
  quantidadeParcelas?: number | null
  status?: string | null
}) {
  const valor = Number(input.valor ?? 0)
  const valorPago = Math.max(Number(input.valorPago ?? 0), 0)
  const quantidadeParcelas = Number(input.quantidadeParcelas ?? 0)

  if (!Number.isFinite(valor) || valor <= 0) return null
  if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas <= 0) return null

  if (input.status === 'QUITADO') {
    return { current: quantidadeParcelas, total: quantidadeParcelas }
  }

  const amortizacaoPrincipal = valor / quantidadeParcelas
  if (!Number.isFinite(amortizacaoPrincipal) || amortizacaoPrincipal <= 0) return null

  const parcelasPagas = Math.min(
    quantidadeParcelas,
    Math.max(0, Math.floor((valorPago + 0.000001) / amortizacaoPrincipal)),
  )

  return {
    // A parcela atual representa quantas parcelas já foram pagas. Assim, um
    // acordo recém-criado começa na parcela 0 e vai para 1 após o primeiro
    // pagamento, sem pular diretamente para 2.
    current: parcelasPagas,
    total: quantidadeParcelas,
  }
}

export function calculatePaidPrincipalFromCurrentInstallment(input: {
  valor?: number | null
  quantidadeParcelas?: number | null
  currentInstallment?: number | null
}) {
  const valor = Number(input.valor ?? 0)
  const quantidadeParcelas = Number(input.quantidadeParcelas ?? 0)
  const currentInstallment = Number(input.currentInstallment ?? 0)

  if (!Number.isFinite(valor) || valor <= 0) return 0
  if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas <= 0) return 0
  if (!Number.isInteger(currentInstallment) || currentInstallment <= 0) return 0

  const parcelasPagas = Math.min(quantidadeParcelas, currentInstallment)
  return (valor / quantidadeParcelas) * parcelasPagas
}
