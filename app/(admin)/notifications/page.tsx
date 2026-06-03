import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NotifComposer } from './notif-composer'

export default async function NotificationsPage() {
  await requireAdmin(3)
  const db = createServiceClient()

  const [
    { data: users },
    { data: log },
  ] = await Promise.all([
    db.from('users').select('id, email').order('email').limit(500),
    db.from('notifications')
      .select('id, user_id, title, body, read, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Resolve user emails for the log
  const logUserIds = [...new Set((log ?? []).map(n => n.user_id).filter(Boolean))]
  const { data: logUsers } = logUserIds.length > 0
    ? await db.from('users').select('id, email').in('id', logUserIds)
    : { data: [] }
  const emailMap: Record<string, string> = {}
  for (const u of logUsers ?? []) emailMap[u.id] = u.email

  return (
    <div className="p-7 space-y-7">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Notifications</h1>
        <p className="text-[13px] text-salty-muted">Send push notifications to individual users or broadcast to all</p>
      </div>

      <NotifComposer users={users ?? []} />

      {/* Log */}
      <div>
        <h2 className="font-sora text-[15px] font-bold text-salty-text mb-3">Recent Notification Log</h2>
        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-salty-border bg-cream">
                {['Title','Body','User','Read','Sent'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(log ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-salty-muted">No notifications sent yet</td></tr>
              ) : (
                (log ?? []).map(n => (
                  <tr key={n.id} className="border-b border-salty-border last:border-0 hover:bg-cream">
                    <td className="px-4 py-3 text-[13px] font-medium text-salty-text">{n.title}</td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary max-w-xs"><p className="truncate">{n.body}</p></td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary">{emailMap[n.user_id] ?? n.user_id?.slice(0,8)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${n.read ? 'bg-stone text-salty-muted' : 'bg-ember-light text-ember'}`}>
                        {n.read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
