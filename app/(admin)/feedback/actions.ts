'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID, assertEnum } from '@/lib/validate'

const VALID_STATUSES = ['read', 'actioned'] as const

export async function updateFeedbackStatus(id: string, status: 'read' | 'actioned') {
  const admin  = await requireAdmin(3)
  const fid    = assertUUID(id, 'Feedback ID')
  const status_ = assertEnum(status, VALID_STATUSES, 'Status')
  const db     = createServiceClient()

  // Verify record exists
  const { data: fb } = await db.from('feedback').select('id').eq('id', fid).single()
  if (!fb) throw new Error('Feedback record not found.')

  await db.from('feedback').update({ status: status_ }).eq('id', fid)
  await logAudit(admin.id, `feedback_${status_}`, 'feedback', fid)
  revalidatePath('/feedback')
}
