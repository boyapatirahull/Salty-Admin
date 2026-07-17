import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { PhotoTable } from './photo-table'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 30

export default async function PhotosPage({ searchParams }: PageProps) {
  await requireAdmin(3)
  const { page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const offset  = (pageNum - 1) * PAGE_SIZE
  const db = createServiceClient()

  const { data: photos, count: photoCount } = await db
    .from('photos')
    .select('id, ticket_id, user_id, media_type, match_method, match_confidence, taken_at', { count: 'exact' })
    .order('taken_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const userIds = [...new Set((photos ?? []).map(p => p.user_id))]
  const { data: users } = userIds.length > 0
    ? await db.from('users').select('id, email').in('id', userIds)
    : { data: [] }
  const emailMap = new Map<string, string>()
  for (const u of users ?? []) if (typeof u.id === 'string' && typeof u.email === 'string') emailMap.set(u.id, u.email)

  const rows = (photos ?? []).map(p => ({ ...p, user_email: emailMap.get(p.user_id) ?? '—' }))
  const totalPages = Math.max(1, Math.ceil((photoCount ?? 0) / PAGE_SIZE))

  return (
    <div className="p-7 space-y-5">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Photos</h1>
        <p className="text-[13px] text-salty-muted">
          {(photoCount ?? 0).toLocaleString()} total · review and remove photos attached to tickets
        </p>
      </div>

      <PhotoTable photos={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-salty-muted">
          <span>Page {pageNum} of {totalPages}</span>
          <div className="flex gap-3">
            {pageNum > 1 && <Link href={`/photos?page=${pageNum - 1}`} className="hover:text-ember">← Previous</Link>}
            {pageNum < totalPages && <Link href={`/photos?page=${pageNum + 1}`} className="hover:text-ember">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
