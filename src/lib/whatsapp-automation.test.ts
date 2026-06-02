import { describe, expect, it, vi, afterEach } from 'vitest'
import { computeLoanFacts, isRuleMatch, renderTemplate, validateAutomationWindow } from './whatsapp-automation-core'

afterEach(() => {
  vi.useRealTimers()
})

function buildLoan(overrides?: Partial<Parameters<typeof computeLoanFacts>[0]>) {
  return {
    id: 'loan-base',
    valor: 1000,
    valorPago: 100,
    jurosMes: 5,
    jurosAtrasoDia: 1,
    vencimento: new Date('2026-05-15T12:00:00.000Z'),
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    status: 'ABERTO',
    cliente: { nome: 'Maria', whatsapp: '71999999999' },
    ...overrides,
  }
}

describe('whatsapp-automation situational', () => {
  it('facts: future due date means no late days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysFromDue).toBe(-5)
    expect(facts.daysLate).toBe(0)
    expect(facts.saldo).toBe(900)
  })

  it('facts: closed contract blocks automation', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan({ status: 'QUITADO' }))
    expect(facts.isClosed).toBe(true)
    expect(isRuleMatch({ triggerType: 'LATE', offsetDays: 5, recurrenceDays: null }, facts)).toBe(false)
  })

  it('facts: invalid whatsapp blocks automation', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan({ cliente: { nome: 'Maria', whatsapp: '12' } }))
    expect(facts.hasValidWhatsapp).toBe(false)
    expect(isRuleMatch({ triggerType: 'LATE', offsetDays: 5, recurrenceDays: null }, facts)).toBe(false)
  })

  it('facts: zero balance blocks automation', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan({ valorPago: 1000 }))
    expect(facts.saldo).toBe(0)
    expect(isRuleMatch({ triggerType: 'LATE', offsetDays: 5, recurrenceDays: null }, facts)).toBe(false)
  })

  it('rule PRE_DUE matches exact negative offset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysFromDue).toBe(-3)
    expect(isRuleMatch({ triggerType: 'PRE_DUE', offsetDays: -3, recurrenceDays: null }, facts)).toBe(true)
  })

  it('rule PRE_DUE does not match different day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-11T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(isRuleMatch({ triggerType: 'PRE_DUE', offsetDays: -3, recurrenceDays: null }, facts)).toBe(false)
  })

  it('rule DUE matches only on due day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(isRuleMatch({ triggerType: 'DUE', offsetDays: 0, recurrenceDays: null }, facts)).toBe(true)
  })

  it('rule DUE does not match one day after due date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(isRuleMatch({ triggerType: 'DUE', offsetDays: 0, recurrenceDays: null }, facts)).toBe(false)
  })

  it('rule LATE matches exact late day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-22T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysLate).toBe(7)
    expect(isRuleMatch({ triggerType: 'LATE', offsetDays: 7, recurrenceDays: null }, facts)).toBe(true)
  })

  it('rule LATE does not match before target late day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-21T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(isRuleMatch({ triggerType: 'LATE', offsetDays: 7, recurrenceDays: null }, facts)).toBe(false)
  })

  it('rule RECURRING matches when modulo day aligns', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-23T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysLate).toBe(8)
    expect(isRuleMatch({ triggerType: 'RECURRING', offsetDays: 2, recurrenceDays: 2 }, facts)).toBe(true)
  })

  it('rule RECURRING does not match before initial offset', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysLate).toBe(1)
    expect(isRuleMatch({ triggerType: 'RECURRING', offsetDays: 2, recurrenceDays: 2 }, facts)).toBe(false)
  })

  it('rule RECURRING with null recurrenceDays defaults to 1 day cadence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysLate).toBe(3)
    expect(isRuleMatch({ triggerType: 'RECURRING', offsetDays: 2, recurrenceDays: null }, facts)).toBe(true)
  })

  it('rule RECURRING respects the initial offset before applying cadence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(facts.daysLate).toBe(3)
    expect(isRuleMatch({ triggerType: 'RECURRING', offsetDays: 3, recurrenceDays: 2 }, facts)).toBe(true)
  })

  it('rule unknown trigger never matches', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'))

    const facts = computeLoanFacts(buildLoan())
    expect(isRuleMatch({ triggerType: 'OTHER', offsetDays: 0, recurrenceDays: null }, facts)).toBe(false)
  })

  it('renderTemplate replaces all supported tags', () => {
    const message = renderTemplate(
      'Oi {cliente_nome}, contrato {contrato_id}, valor {valor}, pago {valor_pago}, saldo {saldo}, juros {juros_mes}, atraso dia {juros_atraso_dia}, atraso {dias_atraso}, vence {data_vencimento}.',
      {
        clienteNome: 'Ana',
        contratoId: 'ABC123',
        valor: 1000,
        valorPago: 200,
        saldo: 800,
        jurosMes: 5,
        jurosAtrasoDia: 1.25,
        diasAtraso: 7,
        dataVencimento: new Date('2026-05-08T12:00:00.000Z'),
      },
    )

    expect(message).toContain('Ana')
    expect(message).toContain('ABC123')
    expect(message).toContain('R$\u00a01.000,00')
    expect(message).toContain('R$\u00a0200,00')
    expect(message).toContain('R$\u00a0800,00')
    expect(message).toContain('5,00%')
    expect(message).toContain('1,25%')
    expect(message).toContain('7')
    expect(message).toContain('08/05/2026')
  })

  it('renderTemplate keeps unknown tags untouched', () => {
    const message = renderTemplate('Token desconhecido {foo}', {
      clienteNome: 'Teste',
      contratoId: '1',
      valor: 1,
      valorPago: 0,
      saldo: 1,
      jurosMes: 0,
      jurosAtrasoDia: 0,
      diasAtraso: 0,
      dataVencimento: null,
    })

    expect(message).toContain('{foo}')
  })

  it('validateAutomationWindow blocks weekends when disabled', () => {
    const result = validateAutomationWindow(
      { timezone: 'America/Bahia', sendOnWeekends: false },
      { sendTime: '09:00' },
      new Date('2026-05-16T12:00:00.000Z'),
    )

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('finais de semana')
  })

  it('validateAutomationWindow blocks before rule send time', () => {
    const result = validateAutomationWindow(
      { timezone: 'America/Bahia', sendOnWeekends: true },
      { sendTime: '10:00' },
      new Date('2026-05-15T12:30:00.000Z'),
    )

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('10:00')
  })

  it('validateAutomationWindow blocks quiet hours across midnight', () => {
    const result = validateAutomationWindow(
      { timezone: 'America/Bahia', sendOnWeekends: true, quietHoursStart: '22:00', quietHoursEnd: '08:00' },
      { sendTime: '06:00' },
      new Date('2026-05-15T09:30:00.000Z'),
    )

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('horário silencioso')
  })
})
