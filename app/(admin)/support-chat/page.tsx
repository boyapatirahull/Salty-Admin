import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnfinishedOverlay } from '@/components/unfinished-overlay'
import { ConversationTable, type ConversationRow } from './conversation-table'
import { RealtimeRefresher } from './realtime-refresher'

export default async function SupportChatPage() {
  const admin = await requireAdmin(3)

  // The mobile side of Support Chat isn't built yet, so it stays Super-Admin-only
  // until it is. Everyone else sees the inbox behind a "not ready" veil.
  // sendReply/closeConversation enforce level 1 — that is the real gate; this is
  // only the display half of it.
  const locked = admin.access_level !== 1

  const db = createServiceClient()
  const showFullPii = admin.access_level <= 2

  const { data: conversations } = await db
    .from('support_conversations')
    .select('id, user_id, status, closed_by, closed_at, created_at, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(200)

  const convos = conversations ?? []
  const userIds = [...new Set(convos.map((c) => c.user_id))]
  const conversationIds = convos.map((c) => c.id)

  const [{ data: users }, { data: messages }] = await Promise.all([
    userIds.length > 0
      ? db.from('users').select('id, email, display_name, username').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; email: string; display_name: string | null; username: string | null }[] }),
    conversationIds.length > 0
      ? db.from('support_conversation_messages')
          .select('conversation_id, sender_type, message, created_at, read_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { conversation_id: string; sender_type: string; message: string; created_at: string; read_at: string | null }[] }),
  ])

  const userById = new Map((users ?? []).map((u) => [u.id, u]))
  const lastMessageByConvo = new Map<string, { sender_type: string; message: string }>()
  const unreadConvoIds = new Set<string>()
  for (const m of messages ?? []) {
    if (!lastMessageByConvo.has(m.conversation_id)) lastMessageByConvo.set(m.conversation_id, m)
    if (m.sender_type === 'user' && m.read_at === null) unreadConvoIds.add(m.conversation_id)
  }

  const rows: ConversationRow[] = convos.map((c) => {
    const u = userById.get(c.user_id)
    const last = lastMessageByConvo.get(c.id)
    const email = u?.email ?? '—'
    return {
      id: c.id,
      status: c.status as 'open' | 'closed',
      closedBy: c.closed_by,
      userEmail: showFullPii || email === '—' ? email : maskEmail(email),
      userDisplayName: u?.display_name ?? u?.username ?? null,
      lastMessagePreview: last?.message ?? '',
      lastSenderType: (last?.sender_type as 'user' | 'admin' | undefined) ?? null,
      lastMessageAt: c.last_message_at,
      unread: unreadConvoIds.has(c.id),
    }
  })

  const open = rows.filter((r) => r.status === 'open')
  const closed = rows.filter((r) => r.status === 'closed')
  const unreadCount = rows.filter((r) => r.unread).length

  const content = (
    <div className="p-7 space-y-5">
      {/* No point holding a realtime subscription open for a veiled page. */}
      {!locked && <RealtimeRefresher />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-[20px] font-bold text-salty-text">Support Chat</h1>
          <p className="text-[13px] text-salty-muted">{unreadCount} unread</p>
        </div>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="bg-stone">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
        </TabsList>

        {[
          { value: 'open', rows: open },
          { value: 'closed', rows: closed },
        ].map(({ value, rows }) => (
          <TabsContent key={value} value={value}>
            <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
              <ConversationTable rows={rows} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )

  return locked
    ? <UnfinishedOverlay title="Feature for future" message="Built but locked for now.">{content}</UnfinishedOverlay>
    : content
}
