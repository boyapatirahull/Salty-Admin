import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'

interface ScanJob {
  id: string
  user_id: string | null
  status: string | null
  total_assets: number | null
  scanned_assets: number | null
  matched_count: number | null
  new_ticket_count: number | null
  consent_given: boolean | null
  created_at: string | null
  updated_at?: string | null
  started_at?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  completed:  'bg-[#EAF4EE] text-[#3E8A5A]',
  running:    'bg-[#EBF2FA] text-[#3A72A8]',
  verifying:  'bg-[#EBF2FA] text-[#3A72A8]',
  pending:    'bg-stone text-salty-secondary',
  failed:     'bg-[#FDEDED] text-[#BF4A3A]',
}

function jobTime(j: ScanJob): number {
  const t = j.updated_at ?? j.started_at ?? j.created_at
  return t ? new Date(t).getTime() : 0
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

export default async function PhotoScansPage() {
  const admin = await requireAdmin(3)
  const showPii = admin.access_level <= 2
  const db = createServiceClient()

  const [{ data: jobsRaw }, { data: proposalsRaw }] = await Promise.all([
    db.from('photo_scan_jobs').select('*').limit(500),
    db.from('photo_match_proposals').select('status, ai_verified'),
  ])

  const jobs = ((jobsRaw ?? []) as ScanJob[]).sort((a, b) => jobTime(b) - jobTime(a))
  const proposals = proposalsRaw ?? []

  // Job status breakdown
  const statusCounts: Record<string, number> = {}
  for (const j of jobs) statusCounts[j.status ?? 'unknown'] = (statusCounts[j.status ?? 'unknown'] ?? 0) + 1

  // Stuck = running/verifying and last touched > 1h ago
  const oneHourAgo = Date.now() - 3_600_000
  const stuck = jobs.filter(j => (j.status === 'running' || j.status === 'verifying') && jobTime(j) > 0 && jobTime(j) < oneHourAgo)

  // Proposal breakdown
  const propPending  = proposals.filter(p => p.status === 'pending').length
  const propApproved = proposals.filter(p => p.status === 'approved').length
  const propRejected = proposals.filter(p => p.status === 'rejected').length
  const propVerified = proposals.filter(p => p.ai_verified === true).length

  // Resolve user emails for the recent jobs table
  const userIds = [...new Set(jobs.map(j => j.user_id).filter((v): v is string => !!v))].slice(0, 200)
  const { data: users } = userIds.length > 0
    ? await db.from('users').select('id, email').in('id', userIds)
    : { data: [] }
  const emailMap: Record<string, string> = {}
  for (const u of users ?? []) emailMap[u.id] = u.email

  const recent = jobs.slice(0, 60)

  return (
    <div className="p-7 space-y-6">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Photo Scans</h1>
        <p className="text-[13px] text-salty-muted">Device photo-library scan jobs and AI match proposals across all users</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Jobs" value={jobs.length.toLocaleString()} accent="#E8581A" />
        <StatCard label="Completed" value={statusCounts['completed'] ?? 0} accent="#5A9E6F" />
        <StatCard label="Failed" value={statusCounts['failed'] ?? 0} accent="#BF4A3A" />
        <StatCard label="Stuck (>1h)" value={stuck.length} accent="#C8A96E" />
        <StatCard label="Pending Proposals" value={propPending} accent="#5A8FBF" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
          <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">Jobs by Status</h2></div>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-salty-muted">No scan jobs yet</p>
          ) : (
            Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between border-b border-salty-border px-5 py-3 last:border-0">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLOR[status] ?? 'bg-stone text-salty-secondary'}`}>{status}</span>
                <span className="font-sora text-[15px] font-bold text-salty-text">{count}</span>
              </div>
            ))
          )}
        </div>

        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
          <div className="border-b border-salty-border px-5 py-4"><h2 className="font-sora text-[14px] font-bold text-salty-text">Match Proposals</h2></div>
          <div className="flex items-center justify-between border-b border-salty-border px-5 py-3"><span className="text-[13px] text-salty-secondary">Pending</span><span className="font-sora text-[15px] font-bold text-salty-text">{propPending}</span></div>
          <div className="flex items-center justify-between border-b border-salty-border px-5 py-3"><span className="text-[13px] text-salty-secondary">Approved</span><span className="font-sora text-[15px] font-bold text-salty-text">{propApproved}</span></div>
          <div className="flex items-center justify-between border-b border-salty-border px-5 py-3"><span className="text-[13px] text-salty-secondary">Rejected</span><span className="font-sora text-[15px] font-bold text-salty-text">{propRejected}</span></div>
          <div className="flex items-center justify-between px-5 py-3"><span className="text-[13px] text-salty-secondary">AI-verified</span><span className="font-sora text-[15px] font-bold text-salty-text">{propVerified}</span></div>
        </div>
      </div>

      <div>
        <h2 className="font-sora text-[15px] font-bold text-salty-text mb-3">Recent Jobs</h2>
        <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-salty-border bg-cream">
                  {['User', 'Status', 'Progress', 'Matched', 'New Tickets', 'Consent', 'Updated'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-salty-muted">No scan jobs</td></tr>
                ) : (
                  recent.map(j => {
                    const email = j.user_id ? emailMap[j.user_id] : undefined
                    const t = jobTime(j)
                    return (
                      <tr key={j.id} className="border-b border-salty-border last:border-0 hover:bg-cream">
                        <td className="px-4 py-3 text-[12px] text-salty-secondary">
                          {j.user_id ? (
                            <Link href={`/users/${j.user_id}`} className="hover:text-ember hover:underline">
                              {email ? (showPii ? email : maskEmail(email)) : j.user_id.slice(0, 8)}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLOR[j.status ?? ''] ?? 'bg-stone text-salty-secondary'}`}>{j.status ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">{j.scanned_assets ?? 0} / {j.total_assets ?? 0}</td>
                        <td className="px-4 py-3 text-[12px] text-salty-text">{j.matched_count ?? 0}</td>
                        <td className="px-4 py-3 text-[12px] text-salty-text">{j.new_ticket_count ?? 0}</td>
                        <td className="px-4 py-3 text-[12px] text-salty-secondary">{j.consent_given ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">{t ? new Date(t).toLocaleString() : '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
