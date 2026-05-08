import { describe, expect, it } from 'vitest'
import { calculateLoanInterest } from './loan-interest'

describe('calculateLoanInterest', () => {
  it('returns only principal when there is no monthly interest', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 0,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-05-01T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.principalRestante).toBe(1000)
    expect(result.jurosPendente).toBe(0)
    expect(result.totalDevido).toBe(1000)
  })

  it('does not accrue interest before the due date', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-05-18T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.jurosPendente).toBe(0)
    expect(result.totalDevido).toBe(1000)
    expect(result.monthsAccrued).toBe(0)
  })

  it('accrues one monthly period on the exact due date', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-05-08T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.jurosBase).toBe(50)
    expect(result.monthsAccrued).toBe(1)
    expect(result.jurosPendente).toBe(50)
    expect(result.totalDevido).toBe(1050)
  })

  it('accrues linear monthly interest across calendar months when there is no daily late fee', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      vencimento: new Date('2026-02-10T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.jurosBase).toBe(50)
    expect(result.monthsAccrued).toBe(4)
    expect(result.jurosPendente).toBe(200)
    expect(result.totalDevido).toBe(1200)
  })

  it('accrues compounded daily late interest over the monthly base', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 5,
      jurosAtrasoDia: 1,
      vencimento: new Date('2026-05-01T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.jurosBase).toBe(50)
    expect(result.daysLate).toBe(7)
    expect(result.usesDailyLateInterest).toBe(true)
    expect(result.jurosPendente).toBeCloseTo(53.6067676, 4)
    expect(result.totalDevido).toBeCloseTo(1053.6067676, 4)
  })

  it('supports decimal monthly rates and cent-level payments without drifting the balance', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 33.33,
      jurosMes: 2.5,
      jurosAtrasoDia: 0,
      jurosPagos: 16.67,
      vencimento: new Date('2026-05-08T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.principalRestante).toBeCloseTo(966.67, 2)
    expect(result.jurosBase).toBeCloseTo(24.16675, 5)
    expect(result.jurosPendente).toBeCloseTo(7.49675, 5)
    expect(result.totalDevido).toBeCloseTo(974.16675, 5)
  })

  it('falls back to createdAt when there is no explicit due date', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 0,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      createdAt: new Date('2026-05-08T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.monthsAccrued).toBe(1)
    expect(result.jurosPendente).toBe(50)
    expect(result.totalDevido).toBe(1050)
  })

  it('keeps pending interest visible when the principal is paid but accrued interest is still open', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 1000,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      jurosPagos: 25,
      vencimento: new Date('2026-05-08T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.principalRestante).toBe(0)
    expect(result.jurosPendente).toBe(25)
    expect(result.totalDevido).toBe(25)
  })

  it('does not create interest when the principal is fully paid before the due date', () => {
    const result = calculateLoanInterest({
      valor: 1000,
      valorPago: 1000,
      jurosMes: 5,
      jurosAtrasoDia: 0,
      jurosPagos: 0,
      vencimento: new Date('2026-05-18T12:00:00.000Z'),
      now: new Date('2026-05-08T12:00:00.000Z'),
    })

    expect(result.principalRestante).toBe(0)
    expect(result.jurosPendente).toBe(0)
    expect(result.totalDevido).toBe(0)
  })
})
