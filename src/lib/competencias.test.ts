import { describe, expect, it } from 'vitest'
import { suggestedCompetenciaDates } from './competencias'

describe('suggestedCompetenciaDates', () => {
  it('não gera competências anteriores ao primeiro vencimento de um contrato novo', () => {
    const dates = suggestedCompetenciaDates(
      new Date(Date.UTC(2026, 8, 1)),
      new Date(Date.UTC(2026, 7, 17)),
    )

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual(['2026-09-01'])
  })

  it('mantém competências vencidas após o início do contrato', () => {
    const dates = suggestedCompetenciaDates(
      new Date(Date.UTC(2026, 8, 1)),
      new Date(Date.UTC(2026, 9, 17)),
    )

    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ])
  })
})
