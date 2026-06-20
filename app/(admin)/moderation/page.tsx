import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoGrid } from './photo-grid'
import { ContentTable } from './content-table'
import { deleteNoteAction, deleteTagAction } from './actions'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

const PAGE_SIZE = 24

export default async function ModerationPage({ searchParams }: PageProps) {
  await requireAdmin(3)
  const { page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const offset  = (pageNum - 1) * PAGE_SIZE
  const db = createServiceClient()

  const [
    { data: photos, count: photoCount },
    { data: notes,  count: noteCount },
    { data: tags,   count: tagCount },
  ] = await Promise.all([
    db.from('photos')
      .select('id, ticket_id, user_id, storage_url, media_type, match_method, match_confidence, taken_at', { count: 'exact' })
      .order('taken_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    db.from('ticket_notes').select('id, ticket_id, user_id, text, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
    db.from('ticket_tags').select('id, ticket_id, user_id, tag_text, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
  ])

  // Resolve user emails for all three content types
  const allUserIds = [...new Set([
    ...(photos ?? []).map(p => p.user_id),
    ...(notes ?? []).map(n => n.user_id),
    ...(tags ?? []).map(t => t.user_id),
  ])]
  const { data: users } = allUserIds.length > 0
    ? await db.from('users').select('id, email').in('id', allUserIds)
    : { data: [] }
  const emailMap: Record<string, string> = {}
  for (const u of users ?? []) emailMap[u.id] = u.email

  const photosEnriched = (photos ?? []).map(p => ({ ...p, user_email: emailMap[p.user_id] ?? '—' }))
  const notesEnriched  = (notes ?? []).map(n => ({ ...n, text: n.text, user_email: emailMap[n.user_id] ?? '—' }))
  const tagsEnriched   = (tags ?? []).map(t => ({ ...t, text: t.tag_text, user_email: emailMap[t.user_id] ?? '—' }))

  const totalPages = Math.ceil((photoCount ?? 0) / PAGE_SIZE)

  return (
    <div className="p-7 space-y-5">
      <div>
        <h1 className="font-sora text-[20px] font-bold text-salty-text">Content Moderation</h1>
        <p className="text-[13px] text-salty-muted">Review and remove user-generated content attached to tickets</p>
      </div>

      <Tabs defaultValue="photos">
        <TabsList className="bg-stone">
          <TabsTrigger value="photos">Photos ({photoCount ?? 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({noteCount ?? 0})</TabsTrigger>
          <TabsTrigger value="tags">Tags ({tagCount ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <div className="space-y-4">
            <PhotoGrid photos={photosEnriched} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-[13px] text-salty-muted">
                <span>Page {pageNum} of {totalPages}</span>
                <div className="flex gap-3">
                  {pageNum > 1 && <Link href={`/moderation?page=${pageNum - 1}`} className="hover:text-ember">← Previous</Link>}
                  {pageNum < totalPages && <Link href={`/moderation?page=${pageNum + 1}`} className="hover:text-ember">Next →</Link>}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
            <ContentTable rows={notesEnriched} emptyLabel="No ticket notes yet" onDelete={deleteNoteAction} />
          </div>
        </TabsContent>

        <TabsContent value="tags">
          <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
            <ContentTable rows={tagsEnriched} emptyLabel="No ticket tags yet" onDelete={deleteTagAction} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
