import { describe, expect, it } from 'vitest'

import { includesSearchText, normalizeSearchText } from './search-text'

describe('search-text', () => {
  it.each([
    ['Letícia', 'leticia'],
    ['Antônio', 'Antonio'],
    ['João da Conceição', 'joao da conceicao'],
    ['ÁÉÍÓÚ Ç ÃÕ', 'aeiou c ao'],
  ])('ignora acentos e maiúsculas em %s', (value, query) => {
    expect(includesSearchText(value, query)).toBe(true)
  })

  it('não altera o texto original', () => {
    const value = 'Letícia Antônio'

    normalizeSearchText(value)

    expect(value).toBe('Letícia Antônio')
  })
})
