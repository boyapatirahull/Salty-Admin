import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(1)
  const { searchParams } = req.nextUrl
  const q        = searchParams.get('q')        ?? ''
  const category = searchParams.get('category') ?? ''
  const source   = searchParams.get('source')   ?? ''
  const status   = searchParams.get('status')   ?? ''

  const db = createServiceClient()
  let query = db
    .from('tickets')
    .select('id, user_id, title, venue_name, date_str, time_str, category, source, status, confidence, imported_at')
    .order('imported_at', { ascending: false })
    .limit(10000)

  if (category) query = query.eq('category', category)
  if (source)   query = query.eq('source', source)
  if (status)   query = query.eq('status', status)

  const { data: tickets } = await query

  const userIds = [...new Set((tickets ?? []).map(t => t.user_id))]
  const { data: users } = userIds.length > 0
    ? await db.from('users').select('id, email').in('id', userIds)
    : { data: [] }

  const emailMap: Record<string, string> = {}
  for (const u of users ?? []) emailMap[u.id] = u.email

  let enriched = (tickets ?? []).map(t => ({
    ...t,
    user_email: emailMap[t.user_id] ?? '',
  }))

  if (q) {
    const lower = q.toLowerCase()
    enriched = enriched.filter(
      t => t.title?.toLowerCase().includes(lower)
        || t.venue_name?.toLowerCase().includes(lower)
        || t.user_email.toLowerCase().includes(lower),
    )
  }

  const rows = [
    ['ID', 'User Email', 'Title', 'Venue', 'Date', 'Time', 'Category', 'Source', 'Status', 'Confidence', 'Imported At'].join(','),
    ...enriched.map(t => [
      t.id,
      `"${admin.access_level <= 2 ? t.user_email : maskEmail(t.user_email)}"`,
      `"${(t.title ?? '').replace(/"/g, '""')}"`,
      `"${(t.venue_name ?? '').replace(/"/g, '""')}"`,
      `"${t.date_str ?? ''}"`,
      `"${t.time_str ?? ''}"`,
      t.category,
      t.source,
      t.status,
      t.confidence != null ? Math.round(t.confidence * 100) + '%' : '',
      t.imported_at ? new Date(t.imported_at).toISOString() : '',
    ].join(',')),
  ]

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
