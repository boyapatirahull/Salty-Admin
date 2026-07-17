import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { UnfinishedOverlay } from '@/components/unfinished-overlay'
import { ThreadView } from './thread-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SupportChatThreadPage({ params }: PageProps) {
  const admin = await requireAdmin(3)

  // Super-Admin-only while Support Chat is unfinished — see the inbox page.
  const locked = admin.access_level !== 1

  const { id } = await params
  const db = createServiceClient()
  const showFullPii = admin.access_level <= 2

  const { data: conversation } = await db
    .from('support_conversations')
    .select('id, user_id, status, closed_by, closed_at, created_at')
    .eq('id', id)
    .single()

  if (!conversation) notFound()

  const [{ data: user }, { data: messages }] = await Promise.all([
    db.from('users').select('id, email, display_name, username').eq('id', conversation.user_id).maybeSingle(),
    db.from('support_conversation_messages')
      .select('id, sender_type, sender_id, message, created_at, read_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
  ])

  // Viewing the thread marks the user's messages read — keeps the inbox's unread badge meaningful.
  // Skipped when locked: a veiled thread hasn't really been read by anyone who can
  // act on it, so opening the URL must not clear the Super Admin's unread state.
  const unreadIds = (messages ?? []).filter((m) => m.sender_type === 'user' && m.read_at === null).map((m) => m.id)
  if (unreadIds.length > 0 && !locked) {
    await db.from('support_conversation_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
  }

  const displayEmail = user?.email ? (showFullPii ? user.email : maskEmail(user.email)) : '—'
  const displayName = user?.display_name ?? user?.username ?? displayEmail

  const content = (
    <div className="p-7 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/support-chat" className="text-salty-muted hover:text-salty-text transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-sora text-[20px] font-bold text-salty-text">{displayName}</h1>
          <p className="text-[13px] text-salty-muted">{displayEmail}</p>
        </div>
      </div>

      <ThreadView
        conversationId={conversation.id}
        initialMessages={messages ?? []}
        initialStatus={conversation.status as 'open' | 'closed'}
      />
    </div>
  )

  return locked ? <UnfinishedOverlay>{content}</UnfinishedOverlay> : content
}
