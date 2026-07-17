'use server'

import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { hashInviteToken } from '@/lib/invite'
import { assertString } from '@/lib/validate'
import { logAudit } from '@/lib/auth'

export async function acceptInviteAction(token: string, newPassword: string): Promise<{ ok: true }> {
  const t    = assertString(token, 'Token', 200)
  const pass = assertString(newPassword, 'Password', 128)
  if (pass.length < 8) throw new Error('Password must be at least 8 characters.')

  const db = createServiceClient()
  const hash = hashInviteToken(t)

  // One narrow lookup, then re-validate every condition before writing — never
  // trust the client to have told us the "still valid" state of the token.
  const { data: admin } = await db
    .from('admin_users')
    .select('id, email, is_active, invite_token_expires_at, admin_password_hash')
    .eq('invite_token_hash', hash)
    .maybeSingle()

  if (!admin)                                                              throw new Error('Invalid or expired invite link.')
  if (!admin.is_active)                                                    throw new Error('This admin account is inactive.')
  if (admin.admin_password_hash)                                           throw new Error('A password has already been set.')
  if (!admin.invite_token_expires_at ||
      new Date(admin.invite_token_expires_at) < new Date())                throw new Error('This invite link has expired.')

  const passwordHash = await bcrypt.hash(pass, 12)

  const { error } = await db
    .from('admin_users')
    .update({
      admin_password_hash:      passwordHash,
      password_last_updated_at: new Date().toISOString(),
      // Clear the token so the same link can't be reused, and drop any lockout
      // state that could otherwise leak in from a prior failed session attempt.
      invite_token_hash:        null,
      invite_token_expires_at:  null,
      failed_login_attempts:    0,
      locked_until:             null,
    })
    .eq('id', admin.id)
    // Guard against a concurrent set: only accept if the token hash is still ours.
    .eq('invite_token_hash', hash)
  if (error) throw new Error('Failed to set password.')

  await logAudit(admin.id, 'accept_admin_invite', 'admin_user', admin.id, { email: admin.email })
  return { ok: true }
}
