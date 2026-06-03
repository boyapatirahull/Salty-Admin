import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { Badge } from '@/components/ui/badge'
import { UserSearch } from './user-search'
import { ExternalLink, Download } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ q?: string; zip?: string; tier?: string; page?: string }>
}

const PAGE_SIZE = 50
const TIERS = ['free', 'premium', 'family']
const TIER_COLORS: Record<string, string> = {
  free:    'bg-stone text-salty-muted',
  premium: 'bg-gold-light text-gold',
  family:  'bg-ember-light text-ember',
}

export default async function UsersPage({ searchParams }: PageProps) {
  const admin = await requireAdmin()
  const { q = '', zip = '', tier = '', page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const offset  = (pageNum - 1) * PAGE_SIZE

  const db = createServiceClient()

  let query = db
    .from('users')
    .select('id, email, username, display_name, tier, zip_code, created_at, banned_until', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q)   query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,display_name.ilike.%${q}%`)
  if (zip)  query = query.ilike('zip_code', `%${zip}%`)
  if (tier) query = query.eq('tier', tier)

  const { data: users, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Ticket counts
  const ids = (users ?? []).map(u => u.id)
  const [{ data: ticketCounts }, { data: gmailConns }] = await Promise.all([
    ids.length > 0 ? db.from('tickets').select('user_id').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length > 0 ? db.from('gmail_connections').select('user_id').in('user_id', ids) : Promise.resolve({ data: [] }),
  ])

  const ticketMap: Record<string, number> = {}
  for (const t of ticketCounts ?? []) ticketMap[t.user_id] = (ticketMap[t.user_id] ?? 0) + 1
  const gmailSet = new Set((gmailConns ?? []).map((g: { user_id: string }) => g.user_id))

  return (
    <div className="p-7 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-[20px] font-bold text-salty-text">Users</h1>
          <p className="text-[13px] text-salty-muted">{count?.toLocaleString()} total users</p>
        </div>
        {admin.access_level <= 1 && (
          <a
            href={`/api/export/users?q=${encodeURIComponent(q)}&zip=${encodeURIComponent(zip)}&tier=${encodeURIComponent(tier)}`}
            className="flex items-center gap-1.5 rounded-lg border border-salty-border bg-warm-white px-3 py-2 text-[12px] font-medium text-salty-secondary hover:bg-cream transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        )}
      </div>

      {/* Search + filters */}
      <UserSearch defaultQ={q} defaultZip={zip} defaultTier={tier} tiers={TIERS} />

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-salty-border bg-cream">
                {['User','Username','Tier','Zip','Tickets','Gmail','Joined',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-salty-muted">No users found</td></tr>
              ) : (
                (users ?? []).map(u => (
                  <tr key={u.id} className="border-b border-salty-border last:border-0 transition-colors hover:bg-cream cursor-default">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-salty-text">{admin.access_level <= 2 ? u.email : maskEmail(u.email)}</p>
                        {u.banned_until && new Date(u.banned_until) > new Date() && (
                          <span className="rounded-full bg-[#FDEDED] px-2 py-0.5 text-[10px] font-semibold text-[#BF4A3A]">Banned</span>
                        )}
                      </div>
                      {u.display_name && <p className="text-[11px] text-salty-muted">{u.display_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary">{u.username ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${TIER_COLORS[u.tier ?? 'free'] ?? 'bg-stone text-salty-muted'}`}>
                        {u.tier ?? 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary">{u.zip_code ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-salty-text font-medium">{ticketMap[u.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      {gmailSet.has(u.id)
                        ? <span className="rounded-full bg-[#EAF4EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#3E8A5A]">Connected</span>
                        : <span className="text-[12px] text-salty-muted">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/users/${u.id}`} className="text-salty-muted hover:text-ember transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-salty-muted">
          <span>Page {pageNum} of {totalPages}</span>
          <div className="flex gap-3">
            {pageNum > 1 && <Link href={`/users?q=${q}&zip=${zip}&tier=${tier}&page=${pageNum-1}`} className="hover:text-ember">← Previous</Link>}
            {pageNum < totalPages && <Link href={`/users?q=${q}&zip=${zip}&tier=${tier}&page=${pageNum+1}`} className="hover:text-ember">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
