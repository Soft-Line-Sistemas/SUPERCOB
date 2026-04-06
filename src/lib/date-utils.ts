export function parseDateInputToUTCNoon(value: string) {
  const v = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const [y, m, d] = v.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

export function sanitizeDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}

export function validateBirthDateParts(dia: string, mes: string, ano: string) {
  const next: { dia?: string; mes?: string; ano?: string } = {}
  const d = dia.trim()
  const m = mes.trim()
  const a = ano.trim()
  const anyFilled = d !== '' || m !== '' || a !== ''
  if (!anyFilled) return next
  if (d === '' || m === '' || a === '') {
    if (d === '') next.dia = 'Dia obrigatório'
    if (m === '') next.mes = 'Mês obrigatório'
    if (a === '') next.ano = 'Ano obrigatório'
    return next
  }

  const dd = Number(d)
  const mm = Number(m)
  const yyyy = Number(a)
  if (!Number.isFinite(dd) || dd < 1 || dd > 31) next.dia = 'Dia inválido (01-31)'
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) next.mes = 'Mês inválido (01-12)'
  if (!Number.isFinite(yyyy) || a.length !== 4 || yyyy < 1900 || yyyy > new Date().getFullYear()) next.ano = 'Ano inválido'
  if (next.dia || next.mes || next.ano) return next

  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0, 0))
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) {
    next.dia = 'Data inválida'
    next.mes = 'Data inválida'
    next.ano = 'Data inválida'
  }
  return next
}

