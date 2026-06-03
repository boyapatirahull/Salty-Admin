/**
 * Server-side input validation helpers.
 * All server actions should validate inputs before touching the database.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function assertUUID(value: unknown, label = 'ID'): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected a UUID.`)
  }
  return value
}

export function assertEmail(value: unknown, label = 'Email'): string {
  if (typeof value !== 'string' || !EMAIL_RE.test(value.trim())) {
    throw new Error(`Invalid ${label}: must be a valid email address.`)
  }
  return value.trim().toLowerCase()
}

export function assertString(value: unknown, label = 'Field', max = 500): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`)
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new Error(`${label} cannot be empty.`)
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} chars).`)
  return trimmed
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label = 'Value',
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${label} must be one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

export function assertAccessLevel(value: unknown): 1 | 2 | 3 | 4 {
  const n = Number(value)
  if (![1, 2, 3, 4].includes(n)) throw new Error('Access level must be 1, 2, 3 or 4.')
  return n as 1 | 2 | 3 | 4
}
