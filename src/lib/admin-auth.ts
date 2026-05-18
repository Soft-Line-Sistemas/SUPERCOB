export function isAdminRole(role: unknown) {
  const normalized = String(role || '').toUpperCase()
  return normalized === 'ADM' || normalized === 'ADMIN'
}
