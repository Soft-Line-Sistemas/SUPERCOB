/**
 * Produces a comparison-only version of text used by client-side searches.
 * The original value is never changed, so names keep their accents on screen.
 */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

export function includesSearchText(
  value: string | null | undefined,
  query: string | null | undefined,
): boolean {
  return normalizeSearchText(value).includes(normalizeSearchText(query))
}
