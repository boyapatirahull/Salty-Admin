import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

type Row = Record<string, unknown>

function eventTitle(row: Row): string {
  const c = row.title ?? row.name ?? row.event_name ?? row.artist ?? row.artist_name
  return typeof c === 'string' && c.trim() ? c : '—'
}

function wishTitle(row: Row): string {
  const c = row.artist_or_team ?? row.artist ?? row.artist_name ?? row.team ?? row.name ?? row.title
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

function RankedList({ title, rows, accent = '#E8581A' }: { title: string; rows: [string, number][]; accent?: string }) {
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
                <div className="h-full rounded-full" style={{ width: `${Math.round(count / max * 100)}%`, background: accent }} />
              </div>
            </div>
            <span className="font-sora text-[14px] font-bold text-salty-text shrink-0">{count}</span>
          </div>
        ))
      )}
    </div>
  )
}

export default async function DiscoveryPage() {
  await requireAdmin(3)
  const db = createServiceClient()

  const [{ data: savedRaw }, { data: wishlistsRaw }] = await Promise.all([
    db.from('saved_events').select('*').limit(5000),
    db.from('wishlists').select('*').limit(5000),
  ])

  const saved = (savedRaw ?? []) as Row[]
  const wishlists = (wishlistsRaw ?? []) as Row[]

  const savedUsers = new Set(saved.map(s => s.user_id).filter(Boolean) as string[])
  const wishUsers = new Set(wishlists.map(w => w.user_id).filter(Boolean) as string[])

  const savedCounts: Record<string, number> = {}
  for (const s of saved) {
    const label = eventTitle(s)
    if (label !== '—') savedCounts[label] = (savedCounts[label] ?? 0) + 1
  }
  const wishCounts: Record<string, number> = {}
  for (const w of wishlists) {
    const label = wishTitle(w)
    if (label !== '—') wishCounts[label] = (wishCounts[label] ?? 0) + 1
  }

  const topSaved = Object.entries(savedCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const topWished = Object.entries(wishCounts).sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <div className="p-7 space-y-6">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Discovery</h1>
        <p className="text-[13px] text-salty-muted">Saved events and wishlists — demand signals across users</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Saved Events" value={saved.length.toLocaleString()} accent="#E8581A" />
        <StatCard label="Users Saving" value={savedUsers.size.toLocaleString()} accent="#5A8FBF" />
        <StatCard label="Wishlist Items" value={wishlists.length.toLocaleString()} accent="#7B44A8" />
        <StatCard label="Users Wishing" value={wishUsers.size.toLocaleString()} accent="#C8A96E" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RankedList title="Most Saved Events" rows={topSaved} accent="#E8581A" />
        <RankedList title="Most Wished Artists / Teams" rows={topWished} accent="#7B44A8" />
      </div>
    </div>
  )
}
