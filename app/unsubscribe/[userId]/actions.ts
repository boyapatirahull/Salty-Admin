'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'
import { assertUUID, assertString } from '@/lib/validate'

export async function unsubscribeAction(userIdRaw: string, tokenRaw: string): Promise<void> {
  const userId = assertUUID(userIdRaw, 'User ID')
  const token = assertString(tokenRaw, 'Token', 200)
  if (!verifyUnsubscribeToken(userId, token)) throw new Error('Invalid unsubscribe link.')

  const db = createServiceClient()
  const { error } = await db.from('users').update({ unsubscribed_from_marketing: true }).eq('id', userId)
  if (error) throw new Error('Failed to record unsubscribe.')

  redirect(`/unsubscribe/${encodeURIComponent(userId)}?t=${encodeURIComponent(token)}&done=1`)
}
