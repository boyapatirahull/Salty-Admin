import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedbackTable } from './feedback-table'

export default async function FeedbackPage() {
  await requireAdmin(3)
  const db = createServiceClient()

  const { data: feedback } = await db
    .from('feedback')
    .select('id, user_id, category, rating, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const all      = feedback ?? []
  const unread   = all.filter(f => f.status === 'unread')
  const read     = all.filter(f => f.status === 'read')
  const actioned = all.filter(f => f.status === 'actioned')

  // Aggregate stats
  const avgRating = all.length > 0 ? (all.reduce((s, f) => s + f.rating, 0) / all.length).toFixed(1) : '—'
  const catCounts: Record<string, number> = {}
  for (const f of all) catCounts[f.category] = (catCounts[f.category] ?? 0) + 1
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-[20px] font-bold text-salty-text">Feedback</h1>
          <p className="text-[13px] text-salty-muted">{unread.length} unread</p>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">Total</p>
          <p className="mt-1 font-sora text-[24px] font-bold text-salty-text">{all.length}</p>
        </div>
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">Avg Rating</p>
          <p className="mt-1 font-sora text-[24px] font-bold text-salty-text">{avgRating} <span className="text-base text-gold">★</span></p>
        </div>
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">Top Category</p>
          <p className="mt-1 font-sora text-[18px] font-bold text-salty-text">{topCats[0]?.[0] ?? '—'}</p>
          <p className="text-[11px] text-salty-muted">{topCats[0]?.[1] ?? 0} submissions</p>
        </div>
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">By Category</p>
          <div className="mt-1 space-y-0.5">
            {topCats.slice(0, 3).map(([cat, n]) => (
              <div key={cat} className="flex justify-between text-[12px]">
                <span className="text-salty-secondary">{cat}</span>
                <span className="font-semibold text-salty-text">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="unread">
        <TabsList className="bg-stone">
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
          <TabsTrigger value="read">Read ({read.length})</TabsTrigger>
          <TabsTrigger value="actioned">Actioned ({actioned.length})</TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
        </TabsList>

        {[
          { value: 'unread',   rows: unread },
          { value: 'read',     rows: read },
          { value: 'actioned', rows: actioned },
          { value: 'all',      rows: all },
        ].map(({ value, rows }) => (
          <TabsContent key={value} value={value}>
            <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
              <FeedbackTable rows={rows} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
