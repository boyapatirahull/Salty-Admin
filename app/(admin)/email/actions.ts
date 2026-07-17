'use server'

import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID, assertString, assertEnum } from '@/lib/validate'
import { sendBulkEmail, sendEmail } from '@/lib/email'

export type SegmentType = 'all' | 'tier' | 'active'
export interface Segment {
  type: SegmentType
  tier?: string
  activeDays?: number
}

const VALID_TIERS = ['free', 'premium', 'family'] as const

/** Resolve the list of recipient emails for a segment, excluding banned users. */
async function resolveRecipients(segment: Segment): Promise<string[]> {
  const db = createServiceClient()
  let query = db.from('users').select('email, banned_until')

  if (segment.type === 'tier' && segment.tier) {
    query = query.eq('tier', assertEnum(segment.tier, VALID_TIERS, 'Tier'))
  }
  if (segment.type === 'active' && segment.activeDays) {
    const cutoff = new Date(Date.now() - segment.activeDays * 86_400_000).toISOString()
    query = query.gte('last_seen_at', cutoff)
  }

  const { data } = await query
  const now = Date.now()
  const emails = (data ?? [])
    .filter(u => !u.banned_until || new Date(u.banned_until).getTime() <= now)
    .map(u => u.email)
    .filter((e): e is string => typeof e === 'string' && e.includes('@'))

  return [...new Set(emails.map(e => e.trim().toLowerCase()))]
}

/** Send a one-off email to a single user (by id) from the Email Users page. */
export async function sendSingleEmailAction(
  userId: string,
  subjectRaw: string,
  bodyRaw: string,
): Promise<{ ok: true }> {
  // Super-Admin-only while this page is unfinished — must match the page gate,
  // otherwise hiding the UI does nothing: server actions are callable endpoints.
  // (The per-user dialog on a user's profile is a separate, live surface and
  // still runs at level 2 via sendUserEmailAction in users/actions.ts.)
  const admin = await requireAdmin(1)
  const uid = assertUUID(userId, 'User ID')
  const subject = assertString(subjectRaw, 'Subject', 200)
  const body = assertString(bodyRaw, 'Body', 20_000)

  const db = createServiceClient()
  const { data: user } = await db.from('users').select('id, email').eq('id', uid).single()
  if (!user) throw new Error('User not found.')
  if (!user.email) throw new Error('This user has no email address.')

  await sendEmail(user.email, subject, body)
  await logAudit(admin.id, 'send_user_email', 'user', uid, { subject })
  return { ok: true }
}

/** Live recipient count for the composer preview. */
export async function countRecipientsAction(segment: Segment): Promise<number> {
  await requireAdmin(1)
  const recipients = await resolveRecipients(segment)
  return recipients.length
}

export async function sendBroadcastAction(
  subjectRaw: string,
  bodyRaw: string,
  segment: Segment,
): Promise<{ sent: number; failed: number; recipients: number }> {
  const admin = await requireAdmin(1)
  const subject = assertString(subjectRaw, 'Subject', 200)
  const body = assertString(bodyRaw, 'Body', 20_000)
  assertEnum(segment.type, ['all', 'tier', 'active'] as const, 'Segment')

  const recipients = await resolveRecipients(segment)
  if (recipients.length === 0) throw new Error('No recipients match this segment.')

  const { sent, failed } = await sendBulkEmail(recipients, subject, body)

  // Log the campaign — tolerate the table not existing yet (migration 007 not applied).
  const db = createServiceClient()
  try {
    await db.from('email_campaigns').insert({
      admin_id: admin.id,
      subject,
      body,
      segment,
      recipient_count: recipients.length,
      sent_count: sent,
      failed_count: failed,
    })
  } catch {
    // email_campaigns table not present — skip logging, the send already happened.
  }

  await logAudit(admin.id, 'send_email_broadcast', 'email_campaign', undefined, {
    subject,
    segment,
    recipients: recipients.length,
    sent,
    failed,
  })

  return { sent, failed, recipients: recipients.length }
}
