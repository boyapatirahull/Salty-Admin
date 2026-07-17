import { createHash, randomBytes } from 'crypto'

/**
 * One-time invite / password-set token for the admin panel.
 *
 * Only the SHA-256 hash is persisted (admin_users.invite_token_hash). The raw
 * token is embedded in the invite URL emailed to the invitee, so a DB leak
 * never yields a valid, usable token — a matching URL is still required.
 * 32 random bytes → 43-char base64url string; brute-forcing the hash space is
 * not feasible.
 */
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url')
  return { raw, hash: hashInviteToken(raw) }
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** 48 hours from now, ISO string — matches how other timestamps are written in this repo. */
export function inviteExpiryFromNow(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
}

/**
 * Absolute URL to the accept-invite page. Uses NEXT_PUBLIC_SITE_URL (must be set
 * in every deploy target — dev, staging, prod). No implicit host inference: the
 * URL is what invitees click on, so it must be authoritative, not "whatever host
 * the request happened to arrive at".
 */
export function acceptInviteUrl(rawToken: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SITE_URL is not set — cannot build invite URL.')
  return `${base.replace(/\/+$/, '')}/accept-invite?token=${encodeURIComponent(rawToken)}`
}
