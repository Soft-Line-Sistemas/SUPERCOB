export type EmergencyContactParts = {
  nome: string
  telefone: string
}

export const EMERGENCY_CONTACT_NAME_MAX_LENGTH = 80
export const EMERGENCY_CONTACT_PHONE_MAX_LENGTH = 15
export const EMERGENCY_CONTACT_STORAGE_MAX_LENGTH =
  EMERGENCY_CONTACT_NAME_MAX_LENGTH + EMERGENCY_CONTACT_PHONE_MAX_LENGTH + 1

export function parseEmergencyContact(value: string | null | undefined): EmergencyContactParts {
  const raw = value ?? ''

  if (raw.trim() === '') {
    return { nome: '', telefone: '' }
  }

  const separatorIndex = raw.indexOf('|')
  if (separatorIndex >= 0) {
    return {
      nome: raw.slice(0, separatorIndex),
      telefone: raw.slice(separatorIndex + 1),
    }
  }

  const legacyParts = raw.split('-')
  if (legacyParts.length >= 2) {
    const trimmedParts = legacyParts.map((part) => part.trim()).filter(Boolean)
    const phone = trimmedParts.pop() ?? ''

    return {
      nome: trimmedParts.join(' - '),
      telefone: phone,
    }
  }

  return { nome: raw, telefone: '' }
}

export function buildEmergencyContact(nome: string, telefone: string) {
  if (nome.trim() === '' && telefone.trim() === '') return ''
  return `${nome}|${telefone}`
}

export function normalizeEmergencyContact(value: string | null | undefined) {
  const { nome, telefone } = parseEmergencyContact(value)
  const normalizedNome = nome.trim()
  const normalizedTelefone = telefone.trim()

  if (normalizedNome === '' && normalizedTelefone === '') return null

  return `${normalizedNome}|${normalizedTelefone}`
}

export function isEmergencyContactValid(value: string | null | undefined) {
  const { nome, telefone } = parseEmergencyContact(value)

  return (
    nome.length <= EMERGENCY_CONTACT_NAME_MAX_LENGTH &&
    telefone.length <= EMERGENCY_CONTACT_PHONE_MAX_LENGTH &&
    (normalizeEmergencyContact(value)?.length ?? 0) <= EMERGENCY_CONTACT_STORAGE_MAX_LENGTH
  )
}
