import { redirect } from 'next/navigation'
import { createAuthClient, createServiceClient } from './supabase/server'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  access_level: number
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const auth = await createAuthClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user?.email) return null

  const service = createServiceClient()
  const { data } = await service
    .from('admin_users')
    .select('id, email, full_name, access_level, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .single()

  if (!data) return null
  return { id: data.id, email: data.email, full_name: data.full_name, access_level: data.access_level }
}

/**
 * Require the current request to be from an active admin with access_level <= maxLevel.
 * Level 1 = Super Admin (highest), Level 4 = Support (lowest).
 * Redirects to /login or / on failure.
 */
export async function requireAdmin(maxLevel = 4): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) redirect('/login?error=unauthorized')
  if (admin.access_level > maxLevel) redirect('/?error=forbidden')
  return admin
}

export async function logAudit(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  const service = createServiceClient()
  await service.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata: metadata ?? null,
  })
}
