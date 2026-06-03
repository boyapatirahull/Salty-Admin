'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertString } from '@/lib/validate'

export async function updateProfileAction(fullName: string) {
  const admin = await requireAdmin()
  const name  = assertString(fullName, 'Full name', 100)
  const db    = createServiceClient()

  await db.from('admin_users').update({ full_name: name }).eq('id', admin.id)
  await logAudit(admin.id, 'update_profile', 'admin_user', admin.id)
  revalidatePath('/profile')
}
