'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function loginAction(_: unknown, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const auth = await createAuthClient()

  const { error: signInError } = await auth.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: 'Invalid email or password.' }
  }

  // Verify the user exists in admin_users and is active
  const service = createServiceClient()
  const { data: adminUser } = await service
    .from('admin_users')
    .select('id, is_active')
    .eq('email', email)
    .single()

  if (!adminUser || !adminUser.is_active) {
    await auth.auth.signOut()
    return { error: 'You are not authorized to access this panel.' }
  }

  // Record login time and capture request metadata
  const hdrs = await headers()
  const ip        = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? hdrs.get('x-real-ip') ?? null
  const userAgent = hdrs.get('user-agent') ?? null

  await Promise.all([
    service.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', adminUser.id),
    service.from('admin_login_history').insert({ admin_id: adminUser.id, ip_address: ip, user_agent: userAgent }),
  ])

  redirect('/')
}
