import { describe, expect, it } from 'vitest'
import { parseDateInputToUTCNoon, sanitizeDigits, validateBirthDateParts } from './date-utils'

describe('date-utils', () => {
  it('sanitizeDigits respects maxLen', () => {
    expect(sanitizeDigits('12a3', 2)).toBe('12')
    expect(sanitizeDigits('00/11', 4)).toBe('0011')
  })

  it('parseDateInputToUTCNoon returns null for invalid', () => {
    expect(parseDateInputToUTCNoon('')).toBeNull()
    expect(parseDateInputToUTCNoon('2026-1-01')).toBeNull()
    expect(parseDateInputToUTCNoon('abcd-ef-gh')).toBeNull()
  })

  it('parseDateInputToUTCNoon is stable at noon UTC', () => {
    const d = parseDateInputToUTCNoon('2026-04-02')
    expect(d).not.toBeNull()
    expect(d!.toISOString().startsWith('2026-04-02T12:00:00.000Z')).toBe(true)
  })

  it('validateBirthDateParts requires all fields when any is filled', () => {
    expect(validateBirthDateParts('1', '', '')).toMatchObject({ mes: 'Mês obrigatório', ano: 'Ano obrigatório' })
    expect(validateBirthDateParts('', '1', '')).toMatchObject({ dia: 'Dia obrigatório', ano: 'Ano obrigatório' })
  })

  it('validateBirthDateParts validates ranges and impossible dates', () => {
    expect(validateBirthDateParts('00', '01', '2000')).toMatchObject({ dia: 'Dia inválido (01-31)' })
    expect(validateBirthDateParts('31', '13', '2000')).toMatchObject({ mes: 'Mês inválido (01-12)' })
    expect(validateBirthDateParts('31', '02', '2024')).toMatchObject({ dia: 'Data inválida' })
  })
})

