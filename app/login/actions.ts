'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

export async function loginAction(_: unknown, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const service = createServiceClient()

  const { data: adminUser } = await service
    .from('admin_users')
    .select('id, is_active, admin_password_hash, failed_login_attempts, locked_until')
    .eq('email', email)
    .single()

  if (!adminUser || !adminUser.is_active) {
    return { error: 'Invalid email or password.' }
  }

  // Lockout check — applies regardless of which auth path is used below
  if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
    const minsLeft = Math.ceil((new Date(adminUser.locked_until).getTime() - Date.now()) / 60_000)
    return { error: `Too many failed attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.` }
  }

  async function recordFailure() {
    const attempts = adminUser!.failed_login_attempts + 1
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null
    await service
      .from('admin_users')
      .update({ failed_login_attempts: attempts, locked_until: lockedUntil })
      .eq('id', adminUser!.id)
  }

  async function recordSuccess() {
    await service
      .from('admin_users')
      .update({ failed_login_attempts: 0, locked_until: null })
      .eq('id', adminUser!.id)
  }

  const auth = await createAuthClient()

  // The admin password lives ONLY in admin_users.admin_password_hash. There is
  // deliberately no fallback to auth.signInWithPassword() here: that authenticates
  // against auth.users, the same credential store the mobile app uses, which meant
  // an admin who was also an app user could unlock the admin panel with their app
  // password — and rotating one silently changed the other. An admin with no hash
  // cannot sign in at all until a Super Admin sets one on Settings > Admin Users.
  if (!adminUser.admin_password_hash) {
    return { error: 'No admin password is set for this account. Ask a Super Admin to set one.' }
  }

  const valid = await bcrypt.compare(password, adminUser.admin_password_hash)
  if (!valid) {
    await recordFailure()
    return { error: 'Invalid email or password.' }
  }

  // Session comes from a magic-link token, which never reads or writes the
  // auth.users password — it only mints the Supabase session the RLS policies need.
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) return { error: 'Failed to create session.' }

  const { error: otpError } = await auth.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })
  if (otpError) return { error: 'Failed to create session.' }

  await recordSuccess()

  // Record login
  const hdrs = await headers()
  const ip        = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? hdrs.get('x-real-ip') ?? null
  const userAgent = hdrs.get('user-agent') ?? null

  await Promise.all([
    service.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', adminUser.id),
    service.from('admin_login_history').insert({ admin_id: adminUser.id, ip_address: ip, user_agent: userAgent }),
  ])

  redirect('/')
}
