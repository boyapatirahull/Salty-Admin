'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function loginAction(_: unknown, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const service = createServiceClient()

  const { data: adminUser } = await service
    .from('admin_users')
    .select('id, is_active, admin_password_hash')
    .eq('email', email)
    .single()

  if (!adminUser || !adminUser.is_active) {
    return { error: 'Invalid email or password.' }
  }

  const auth = await createAuthClient()

  if (adminUser.admin_password_hash) {
    // Verify against the admin-specific password
    const valid = await bcrypt.compare(password, adminUser.admin_password_hash)
    if (!valid) return { error: 'Invalid email or password.' }

    // Create a session via magic link token (doesn't touch auth.users password)
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
  } else {
    // No admin password set yet — fall back to Supabase auth
    const { error: signInError } = await auth.auth.signInWithPassword({ email, password })
    if (signInError) return { error: 'Invalid email or password.' }
  }

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
