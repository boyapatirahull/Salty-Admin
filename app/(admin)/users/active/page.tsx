import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { ExternalLink, Wifi } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ window?: string }>
}

const WINDOWS = [
  { key: '15m', label: 'Online now',  ms: 15 * 60 * 1000 },
  { key: '1d',  label: 'Last 24 h',   ms: 24 * 60 * 60 * 1000 },
  { key: '7d',  label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: 'Last 30 days',ms: 30 * 24 * 60 * 60 * 1000 },
]

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1)  return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  <  7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ActiveUsersPage({ searchParams }: PageProps) {
  const admin = await requireAdmin(3)
  const { window: win = '1d' } = await searchParams
  const windowCfg = WINDOWS.find(w => w.key === win) ?? WINDOWS[1]
  const cutoff    = new Date(Date.now() - windowCfg.ms)
  const showPii   = admin.access_level <= 2
  const db        = createServiceClient()

  // Fetch auth users — paginate up to 5 000 (5 pages × 1 000)
  type AuthUser = { id: string; email?: string; last_sign_in_at?: string | null }
  const authUsers: AuthUser[] = []
  let page = 1
  while (page <= 5) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = (data?.users ?? []) as AuthUser[]
    authUsers.push(...batch)
    if (batch.length < 1000) break
    page++
  }

  // Filter to the selected time window and sort newest first
  const recent = authUsers
    .filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= cutoff)
    .sort((a, b) =>
      new Date(b.last_sign_in_at!).getTime() - new Date(a.last_sign_in_at!).getTime()
    )

  // Cross-reference with public.users for display names / tier
  const ids = recent.map(u => u.id)
  const { data: publicUsers } = ids.length > 0
    ? await db.from('users').select('id, email, display_name, username, tier').in('id', ids)
    : { data: [] }

  const pubMap = Object.fromEntries((publicUsers ?? []).map(u => [u.id, u]))

  const TIER_COLORS: Record<string, string> = {
    free:    'bg-stone text-salty-muted',
    premium: 'bg-gold-light text-gold',
    family:  'bg-ember-light text-ember',
  }

  return (
    <div className="p-7 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-[#3E8A5A]" />
            <h1 className="font-sora text-[20px] font-bold text-salty-text">Active Users</h1>
          </div>
          <p className="text-[13px] text-salty-muted mt-0.5">
            {recent.length} user{recent.length !== 1 ? 's' : ''} active in the {windowCfg.label.toLowerCase()} window
          </p>
        </div>
      </div>

      {/* Window tabs */}
      <div className="flex gap-1 rounded-[10px] border border-salty-border bg-stone p-1 w-fit">
        {WINDOWS.map(w => (
          <Link
            key={w.key}
            href={`/users/active?window=${w.key}`}
            className={`rounded-[8px] px-4 py-1.5 text-[12px] font-medium transition-colors ${
              w.key === win
                ? 'bg-warm-white text-salty-text shadow-sm'
                : 'text-salty-muted hover:text-salty-text'
            }`}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-salty-border bg-cream">
                {['User', 'Username', 'Tier', 'Last sign-in', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-salty-muted">
                    No users active in this window
                  </td>
                </tr>
              ) : (
                recent.map(au => {
                  const pub   = pubMap[au.id]
                  const email = pub?.email ?? au.email ?? '—'
                  const displayEmail = showPii ? email : maskEmail(email)
                  const tier  = pub?.tier ?? 'free'
                  return (
                    <tr key={au.id} className="border-b border-salty-border last:border-0 hover:bg-cream transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-salty-text">{displayEmail}</p>
                        {pub?.display_name && (
                          <p className="text-[11px] text-salty-muted">{pub.display_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-salty-secondary">
                        {pub?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${TIER_COLORS[tier] ?? 'bg-stone text-salty-muted'}`}>
                          {tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-salty-text">
                          {relativeTime(au.last_sign_in_at!)}
                        </p>
                        <p className="text-[11px] text-salty-muted">
                          {new Date(au.last_sign_in_at!).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/users/${au.id}`} className="text-salty-muted hover:text-ember transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-salty-muted">
        Sign-in time reflects the last Supabase Auth token issuance — token refreshes in the mobile app keep this current.
      </p>
    </div>
  )
}
