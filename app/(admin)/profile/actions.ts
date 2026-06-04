'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
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

export async function updatePasswordAction(newPassword: string) {
  const admin = await requireAdmin()
  const pass  = assertString(newPassword, 'Password', 128)
  if (pass.length < 8) throw new Error('Password must be at least 8 characters.')

  const hash = await bcrypt.hash(pass, 12)
  const db   = createServiceClient()

  const { error } = await db
    .from('admin_users')
    .update({ admin_password_hash: hash })
    .eq('id', admin.id)

  if (error) throw new Error('Failed to update password.')

  await logAudit(admin.id, 'password_changed', 'admin_user', admin.id)
}
