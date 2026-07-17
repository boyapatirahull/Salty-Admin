import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

type Row = Record<string, unknown>

function nameOf(row: Row): string {
  const c = row.name ?? row.artist_name ?? row.artist ?? row.team ?? row.followable_name ?? row.title
  return typeof c === 'string' && c.trim() ? c : '—'
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

function RankedList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] ?? 1
  return (
    <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
      <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">{title}</h2></div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-salty-muted">No data yet</p>
      ) : (
        rows.map(([name, count]) => (
          <div key={name} className="flex items-center gap-3 border-b border-salty-border px-5 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-salty-text">{name}</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone">
                <div className="h-full rounded-full bg-ember" style={{ width: `${Math.round(count / max * 100)}%` }} />
              </div>
            </div>
            <span className="font-sora text-[14px] font-bold text-salty-text shrink-0">{count}</span>
          </div>
        ))
      )}
    </div>
  )
}

export default async function SocialPage() {
  await requireAdmin(3)
  const db = createServiceClient()

  const [{ data: followsRaw }, { data: friendshipsRaw }] = await Promise.all([
    db.from('followed_artists').select('*').limit(5000),
    db.from('friendships').select('requester_id, addressee_id, status'),
  ])

  const follows = (followsRaw ?? []) as Row[]
  const friendships = friendshipsRaw ?? []

  // Follow aggregates
  const followerSet = new Set(follows.map(f => f.user_id).filter(Boolean) as string[])
  const artistCounts: Record<string, number> = {}
  const teamCounts: Record<string, number> = {}
  for (const f of follows) {
    const label = nameOf(f)
    if (label === '—') continue
    const isTeam = (f.type as string) === 'team'
    const bucket = isTeam ? teamCounts : artistCounts
    bucket[label] = (bucket[label] ?? 0) + 1
  }
  const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const topTeams = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)

  // Friendship aggregates
  const accepted = friendships.filter(f => f.status === 'accepted').length
  const pending = friendships.filter(f => f.status === 'pending').length
  const declined = friendships.filter(f => f.status === 'declined').length

  return (
    <div className="p-7 space-y-6">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Social</h1>
        <p className="text-[13px] text-salty-muted">Artist/team follows and the friendship graph</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Follows" value={follows.length.toLocaleString()} accent="#E8581A" />
        <StatCard label="Users Following" value={followerSet.size.toLocaleString()} accent="#5A8FBF" />
        <StatCard label="Accepted Friendships" value={accepted.toLocaleString()} accent="#5A9E6F" />
        <StatCard label="Pending Requests" value={pending.toLocaleString()} accent="#C8A96E" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RankedList title="Top Followed Artists" rows={topArtists} />
        {topTeams.length > 0
          ? <RankedList title="Top Followed Teams" rows={topTeams} />
          : (
            <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
              <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">Friendships</h2></div>
              <div className="flex items-center justify-between border-b border-salty-border px-5 py-3"><span className="text-[13px] text-salty-secondary">Accepted</span><span className="font-sora text-[15px] font-bold text-salty-text">{accepted}</span></div>
              <div className="flex items-center justify-between border-b border-salty-border px-5 py-3"><span className="text-[13px] text-salty-secondary">Pending</span><span className="font-sora text-[15px] font-bold text-salty-text">{pending}</span></div>
              <div className="flex items-center justify-between px-5 py-3"><span className="text-[13px] text-salty-secondary">Declined</span><span className="font-sora text-[15px] font-bold text-salty-text">{declined}</span></div>
            </div>
          )}
      </div>
    </div>
  )
}
