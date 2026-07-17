import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'

// saved_ai_questions ("Fan Memory AI" / ask-memory). Columns are read defensively
// since the exact shape isn't pinned — question text may live under a few names.
type AiRow = Record<string, unknown> & { id?: string; user_id?: string | null; created_at?: string | null }

function questionText(row: AiRow): string {
  const candidate = row.question ?? row.query ?? row.prompt ?? row.text ?? row.title
  return typeof candidate === 'string' && candidate.trim() ? candidate : '—'
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-salty-border bg-warm-white p-5">
      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[14px]" style={{ background: accent }} />
      <p className="text-[12px] font-medium text-salty-muted">{label}</p>
      <p className="mt-1 font-sora text-[28px] font-bold text-salty-text leading-none">{value}</p>
    </div>
  )
}

export default async function AiUsagePage() {
  const admin = await requireAdmin(3)
  const showPii = admin.access_level <= 2
  const db = createServiceClient()

  const { data: rowsRaw } = await db.from('saved_ai_questions').select('*').limit(1000)
  const rows = (rowsRaw ?? []) as AiRow[]
  rows.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())

  const total = rows.length
  const userIds = [...new Set(rows.map(r => r.user_id).filter((v): v is string => !!v))]
  const uniqueUsers = userIds.length

  const last7 = rows.filter(r => r.created_at && Date.now() - new Date(r.created_at).getTime() <= 7 * 86_400_000).length

  // Per-user counts
  const perUser: Record<string, number> = {}
  for (const r of rows) if (r.user_id) perUser[r.user_id] = (perUser[r.user_id] ?? 0) + 1

  const { data: users } = userIds.length > 0
    ? await db.from('users').select('id, email, display_name').in('id', userIds)
    : { data: [] }
  const userMap: Record<string, { email: string; display_name: string | null }> = {}
  for (const u of users ?? []) userMap[u.id] = { email: u.email, display_name: u.display_name }

  const topUsers = Object.entries(perUser).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const recent = rows.slice(0, 60)

  const emailOf = (uid?: string | null) => {
    if (!uid) return '—'
    const u = userMap[uid]
    if (!u) return uid.slice(0, 8)
    return showPii ? u.email : maskEmail(u.email)
  }

  return (
    <div className="p-7 space-y-6">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">AI Usage</h1>
        <p className="text-[13px] text-salty-muted">&quot;Fan Memory AI&quot; questions asked across all users</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Questions" value={total.toLocaleString()} accent="#E8581A" />
        <StatCard label="Unique Users" value={uniqueUsers.toLocaleString()} accent="#5A8FBF" />
        <StatCard label="Last 7 Days" value={last7.toLocaleString()} accent="#5A9E6F" />
        <StatCard label="Avg / User" value={uniqueUsers ? (total / uniqueUsers).toFixed(1) : '0'} accent="#C8A96E" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
          <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">Top Users</h2></div>
          {topUsers.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-salty-muted">No AI questions yet</p>
          ) : (
            topUsers.map(([uid, count]) => (
              <div key={uid} className="flex items-center justify-between border-b border-salty-border px-5 py-3 last:border-0">
                <Link href={`/users/${uid}`} className="text-[13px] text-salty-secondary hover:text-ember hover:underline truncate">{emailOf(uid)}</Link>
                <span className="font-sora text-[14px] font-bold text-salty-text shrink-0">{count}</span>
              </div>
            ))
          )}
        </div>

        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white lg:row-span-2">
          <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">Recent Questions</h2></div>
          <div className="max-h-[560px] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-salty-muted">No questions</p>
            ) : (
              recent.map((r, i) => (
                <div key={(r.id as string) ?? i} className="border-b border-salty-border px-5 py-3 last:border-0">
                  <p className="text-[13px] text-salty-text">{questionText(r)}</p>
                  <p className="mt-0.5 text-[11px] text-salty-muted">
                    {emailOf(r.user_id)}{r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
