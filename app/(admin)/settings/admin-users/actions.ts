'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID, assertEmail, assertString, assertAccessLevel } from '@/lib/validate'

export async function inviteAdminAction(email: string, fullName: string, accessLevel: number) {
  const admin = await requireAdmin(1)
  const e     = assertEmail(email)
  const n     = assertString(fullName, 'Full Name', 100)
  const lvl   = assertAccessLevel(accessLevel)

  // Super admins cannot invite other super admins via UI
  if (lvl === 1) throw new Error('Cannot invite another Super Admin via this form.')

  const db = createServiceClient()

  // Check for duplicate entry in admin_users
  const { data: existing } = await db.from('admin_users').select('id').eq('email', e).single()
  if (existing) throw new Error('An admin with this email already exists.')

  // Create Supabase auth user (auto-confirmed so they can log in after setting password)
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email: e,
    email_confirm: true,
    user_metadata: { full_name: n },
  })

  if (authErr && !authErr.message.toLowerCase().includes('already')) {
    throw new Error(`Could not create auth account: ${authErr.message}`)
  }

  const { error: insertErr } = await db.from('admin_users').insert({
    email: e,
    full_name: n,
    access_level: lvl,
    invited_by: admin.id,
    is_active: true,
  })
  if (insertErr) throw new Error(insertErr.message)

  // Send password recovery email so the new admin sets their own password
  if (authUser?.user) {
    await db.auth.admin.generateLink({ type: 'recovery', email: e })
  }

  await logAudit(admin.id, 'invite_admin', 'admin_user', undefined, { access_level: lvl })
  revalidatePath('/settings/admin-users')
  return { ok: true }
}

export async function changeAccessLevelAction(targetAdminId: string, newLevel: number) {
  const admin = await requireAdmin(1)
  const tid   = assertUUID(targetAdminId, 'Admin ID')
  const lvl   = assertAccessLevel(newLevel)

  if (tid === admin.id) throw new Error('You cannot change your own access level.')

  const db = createServiceClient()
  const { data: target } = await db.from('admin_users').select('id, email, access_level').eq('id', tid).single()
  if (!target) throw new Error('Admin not found.')

  await db.from('admin_users').update({ access_level: lvl }).eq('id', tid)
  await logAudit(admin.id, 'change_access_level', 'admin_user', tid, {
    from: target.access_level,
    to: lvl,
  })
  revalidatePath('/settings/admin-users')
}

export async function toggleActiveAction(targetAdminId: string, active: boolean) {
  const admin = await requireAdmin(1)
  const tid   = assertUUID(targetAdminId, 'Admin ID')

  if (tid === admin.id) throw new Error('You cannot deactivate yourself.')
  if (typeof active !== 'boolean') throw new Error('Invalid active value.')

  const db = createServiceClient()
  const { data: target } = await db.from('admin_users').select('id, email').eq('id', tid).single()
  if (!target) throw new Error('Admin not found.')

  await db.from('admin_users').update({ is_active: active }).eq('id', tid)

  // Revoke their live Supabase auth session immediately on deactivation
  if (!active) {
    const { data: authUsers } = await db.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === target.email)
    if (authUser) {
      await db.auth.admin.signOut(authUser.id, 'global')
    }
  }

  await logAudit(
    admin.id,
    active ? 'reactivate_admin' : 'deactivate_admin',
    'admin_user',
    tid,
  )
  revalidatePath('/settings/admin-users')
}
