import { createHmac, timingSafeEqual } from 'crypto'

/** Absolute one-click unsubscribe URL. Deterministic given the secret — no DB row per token needed. */
export function unsubscribeUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SITE_URL is not set — cannot build unsubscribe URL.')
  const token = signUnsubscribeToken(userId)
  return `${base.replace(/\/+$/, '')}/unsubscribe/${encodeURIComponent(userId)}?t=${token}`
}

/** Constant-time verify that `token` is a valid signature for `userId`. */
export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = signUnsubscribeToken(userId)
  if (expected.length !== token.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

function signUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET
  if (!secret) throw new Error('UNSUBSCRIBE_TOKEN_SECRET is not set — cannot sign unsubscribe token.')
  return createHmac('sha256', secret).update(userId).digest('base64url')
}
