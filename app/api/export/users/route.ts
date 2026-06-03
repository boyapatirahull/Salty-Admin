import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(1)
  const { searchParams } = req.nextUrl
  const q    = searchParams.get('q')    ?? ''
  const zip  = searchParams.get('zip')  ?? ''
  const tier = searchParams.get('tier') ?? ''

  const db = createServiceClient()
  let query = db
    .from('users')
    .select('id, email, username, display_name, tier, zip_code, created_at, banned_until')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (q)   query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%,display_name.ilike.%${q}%`)
  if (zip)  query = query.ilike('zip_code', `%${zip}%`)
  if (tier) query = query.eq('tier', tier)

  const { data: users } = await query

  const userIds = (users ?? []).map(u => u.id)
  const { data: ticketCounts } = userIds.length > 0
    ? await db.from('tickets').select('user_id').in('user_id', userIds)
    : { data: [] }

  const ticketMap: Record<string, number> = {}
  for (const t of ticketCounts ?? []) ticketMap[t.user_id] = (ticketMap[t.user_id] ?? 0) + 1

  const rows = [
    ['ID', 'Email', 'Username', 'Display Name', 'Tier', 'Zip Code', 'Tickets', 'Banned Until', 'Joined'].join(','),
    ...(users ?? []).map(u => [
      u.id,
      `"${admin.access_level <= 2 ? u.email : maskEmail(u.email)}"`,
      `"${u.username ?? ''}"`,
      `"${u.display_name ?? ''}"`,
      u.tier ?? 'free',
      u.zip_code ?? '',
      ticketMap[u.id] ?? 0,
      u.banned_until ? new Date(u.banned_until).toISOString() : '',
      new Date(u.created_at).toISOString(),
    ].join(',')),
  ]

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="users-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
