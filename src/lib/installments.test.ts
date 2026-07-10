import { describe, expect, it } from 'vitest'

import { calculateEstimatedInstallments, calculateEstimatedMonthlyPayment } from './installments'

describe('calculateEstimatedInstallments', () => {
  it('calcula a quantidade estimada de parcelas com base no valor e no juros mensal', () => {
    expect(
      calculateEstimatedInstallments({
        valor: 1000,
        jurosMes: 30,
      }),
    ).toBe(4)
  })

  it('arredonda para cima quando o valor mensal nao quita o principal exatamente', () => {
    expect(
      calculateEstimatedInstallments({
        valor: 1000,
        jurosMes: 12,
      }),
    ).toBe(9)
  })

  it('retorna null quando faltam campos necessarios para o calculo', () => {
    expect(calculateEstimatedInstallments({ valor: 0, jurosMes: 30 })).toBeNull()
    expect(calculateEstimatedInstallments({ valor: 1000, jurosMes: 0 })).toBeNull()
    expect(calculateEstimatedInstallments({ valor: null, jurosMes: 30 })).toBeNull()
  })

  it('permite usar um percentual total esperado para reduzir a sugestao de parcelas', () => {
    expect(
      calculateEstimatedInstallments({
        valor: 1000,
        jurosMes: 10,
        jurosTotalPercentualEsperado: 50,
      }),
    ).toBe(5)
  })

  it('calcula o valor mensal estimado', () => {
    expect(
      calculateEstimatedMonthlyPayment({
        valor: 3000,
        jurosMes: 15,
        quantidadeParcelas: 10,
      }),
    ).toBe(750)
  })

  it('retorna null para valor mensal quando a quantidade de parcelas nao foi informada', () => {
    expect(
      calculateEstimatedMonthlyPayment({
        valor: 1000,
        jurosMes: 10,
      }),
    ).toBeNull()
  })

  it('calcula o valor mensal estimado com juros zero', () => {
    expect(
      calculateEstimatedMonthlyPayment({
        valor: 6000,
        jurosMes: 0,
        quantidadeParcelas: 20,
      }),
    ).toBe(300)
  })
})
