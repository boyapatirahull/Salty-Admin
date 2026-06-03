'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID, assertString, assertEnum } from '@/lib/validate'

const VALID_TIERS = ['free', 'premium', 'family'] as const

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin(2)
  const uid = assertUUID(userId, 'User ID')
  const db = createServiceClient()

  // Verify the user actually exists before deleting
  const { data: user } = await db.from('users').select('id, email').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  await Promise.all([
    db.from('tickets').delete().eq('user_id', uid),
    db.from('pending_imports').delete().eq('user_id', uid),
    db.from('notifications').delete().eq('user_id', uid),
    db.from('notification_tokens').delete().eq('user_id', uid),
    db.from('friendships').delete().or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
    db.from('gmail_connections').delete().eq('user_id', uid),
    db.from('feedback').update({ user_id: null }).eq('user_id', uid),
    db.storage.from('avatars').remove([
      `${uid}/avatar.jpg`, `${uid}/avatar.jpeg`,
      `${uid}/avatar.png`, `${uid}/avatar.webp`,
    ]),
  ])

  await db.from('users').delete().eq('id', uid)
  await db.auth.admin.deleteUser(uid)

  await logAudit(admin.id, 'delete_user', 'user', uid)
  revalidatePath('/users')
}

export async function sendNotificationAction(userId: string, title: string, body: string) {
  const admin = await requireAdmin(3)
  const uid   = assertUUID(userId, 'User ID')
  const t     = assertString(title, 'Title', 200)
  const b     = assertString(body, 'Body', 1000)

  // Verify user exists
  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY!

  const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ userId: uid, title: t, body: b }),
  })
  if (!res.ok) throw new Error('Failed to send notification.')

  await logAudit(admin.id, 'send_notification', 'user', uid, { title: t })
  return { ok: true }
}

export async function sendPasswordResetAction(userId: string) {
  const admin = await requireAdmin(2)
  const uid   = assertUUID(userId, 'User ID')
  const db    = createServiceClient()

  const { data: user } = await db.from('users').select('id, email').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  const { error } = await db.auth.admin.generateLink({ type: 'recovery', email: user.email })
  if (error) throw new Error('Failed to send password reset email.')

  await logAudit(admin.id, 'password_reset_sent', 'user', uid)
}

export async function forceSignOutAction(userId: string) {
  const admin = await requireAdmin(2)
  const uid   = assertUUID(userId, 'User ID')
  const db    = createServiceClient()

  const { data: user } = await db.from('users').select('id').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  const { error } = await db.auth.admin.signOut(uid, 'global')
  if (error) throw new Error('Failed to sign out user.')

  await logAudit(admin.id, 'force_sign_out', 'user', uid)
}

export async function changeTierAction(userId: string, tier: string) {
  const admin = await requireAdmin(2)
  const uid   = assertUUID(userId, 'User ID')
  const t     = assertEnum(tier, VALID_TIERS, 'Tier')
  const db    = createServiceClient()

  const { data: user } = await db.from('users').select('id, tier').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  await db.from('users').update({ tier: t }).eq('id', uid)
  await logAudit(admin.id, 'change_tier', 'user', uid, { from: user.tier, to: t })
  revalidatePath(`/users/${uid}`)
}

export async function banUserAction(userId: string, bannedUntil: string | null) {
  const admin = await requireAdmin(2)
  const uid   = assertUUID(userId, 'User ID')
  const db    = createServiceClient()

  const { data: user } = await db.from('users').select('id').eq('id', uid).single()
  if (!user) throw new Error('User not found.')

  await db.from('users').update({ banned_until: bannedUntil }).eq('id', uid)
  await logAudit(admin.id, bannedUntil ? 'ban_user' : 'unban_user', 'user', uid, bannedUntil ? { banned_until: bannedUntil } : undefined)
  revalidatePath(`/users/${uid}`)
  revalidatePath('/users')
}
