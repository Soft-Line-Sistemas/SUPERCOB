export function calculateEstimatedInstallments(input: {
  valor?: number | null
  jurosMes?: number | null
}) {
  const valor = Number(input.valor ?? 0)
  const jurosMes = Number(input.jurosMes ?? 0)

  if (!Number.isFinite(valor) || valor <= 0) return null
  if (!Number.isFinite(jurosMes) || jurosMes <= 0) return null

  const monthlyPayment = valor * (jurosMes / 100)
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return null

  return Math.max(1, Math.ceil(valor / monthlyPayment))
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
  if (!Number.isFinite(jurosMes) || jurosMes <= 0) return null
  if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas <= 0) return null

  const jurosDoMes = valor * (jurosMes / 100)
  const amortizacaoPrincipal = valor / quantidadeParcelas
  const monthlyPayment = jurosDoMes + amortizacaoPrincipal
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return null

  return monthlyPayment
}
