import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { RevokeButton } from './revoke-button'
import { ExternalLink } from 'lucide-react'

export default async function GmailConnectionsPage() {
  const admin = await requireAdmin(2)
  const db = createServiceClient()
  const showPii = admin.access_level <= 2

  const { data: connections } = await db
    .from('gmail_connections')
    .select('user_id, email, connected_at, last_synced_at')
    .order('connected_at', { ascending: false })

  const userIds = (connections ?? []).map(c => c.user_id)
  const { data: users } = userIds.length > 0
    ? await db.from('users').select('id, email, display_name').in('id', userIds)
    : { data: [] }

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

  return (
    <div className="p-7 space-y-5">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Gmail Connections</h1>
        <p className="text-[13px] text-salty-muted">{connections?.length ?? 0} connected accounts</p>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-salty-border bg-cream">
                {['User', 'Gmail Account', 'Connected', 'Last Synced', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(connections ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-salty-muted">No Gmail connections</td>
                </tr>
              ) : (
                (connections ?? []).map(c => {
                  const user = userMap[c.user_id]
                  const userEmail = user?.email ?? '—'
                  const displayEmail = showPii ? userEmail : maskEmail(userEmail)
                  const gmailEmail = showPii ? c.email : maskEmail(c.email)
                  return (
                    <tr key={c.user_id} className="border-b border-salty-border last:border-0 transition-colors hover:bg-cream">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-salty-text">{displayEmail}</p>
                        {user?.display_name && <p className="text-[11px] text-salty-muted">{user.display_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-salty-text">{gmailEmail}</td>
                      <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">
                        {c.connected_at ? new Date(c.connected_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">
                        {c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/users/${c.user_id}`} className="text-salty-muted hover:text-ember transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <RevokeButton userId={c.user_id} userEmail={displayEmail} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
