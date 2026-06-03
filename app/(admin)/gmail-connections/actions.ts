'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validate'

export async function revokeGmailConnectionAction(userId: string) {
  const admin = await requireAdmin(2)
  const uid = assertUUID(userId, 'User ID')
  const db = createServiceClient()

  const { data: conn } = await db
    .from('gmail_connections')
    .select('user_id')
    .eq('user_id', uid)
    .single()

  if (!conn) throw new Error('Gmail connection not found.')

  await db.from('gmail_connections').delete().eq('user_id', uid)
  await logAudit(admin.id, 'revoke_gmail_connection', 'user', uid)
  revalidatePath('/gmail-connections')
}
