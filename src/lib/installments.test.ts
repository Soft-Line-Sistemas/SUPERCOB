import { describe, expect, it } from 'vitest'

import {
  calculateCurrentInstallment,
  calculateEstimatedInstallments,
  calculateEstimatedMonthlyPayment,
  calculatePaidPrincipalFromCurrentInstallment,
} from './installments'

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

  it('deriva a parcela atual a partir do principal amortizado', () => {
    expect(
      calculateCurrentInstallment({
        valor: 1000,
        valorPago: 250,
        quantidadeParcelas: 4,
        status: 'NEGOCIACAO',
      }),
    ).toEqual({ current: 1, total: 4 })
  })

  it('inicia na parcela 0 quando não há principal pago', () => {
    expect(
      calculateCurrentInstallment({
        valor: 1000,
        valorPago: 0,
        quantidadeParcelas: 4,
        status: 'NEGOCIACAO',
      }),
    ).toEqual({ current: 0, total: 4 })
  })

  it('calcula o valor pago correspondente a uma parcela atual selecionada', () => {
    expect(
      calculatePaidPrincipalFromCurrentInstallment({
        valor: 1000,
        quantidadeParcelas: 4,
        currentInstallment: 2,
      }),
    ).toBe(500)
  })
})
