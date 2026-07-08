import { describe, expect, it } from 'vitest'

import { calculateEstimatedInstallments } from './installments'

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
})
