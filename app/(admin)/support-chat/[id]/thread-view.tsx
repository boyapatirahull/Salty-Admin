'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sendReplyAction, closeConversationAction } from '../actions'

interface Message {
  id: string
  sender_type: string
  sender_id: string
  message: string
  created_at: string
  read_at: string | null
}

interface ThreadViewProps {
  conversationId: string
  initialMessages: Message[]
  initialStatus: 'open' | 'closed'
}

export function ThreadView({ conversationId, initialMessages, initialStatus }: ThreadViewProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [status, setStatus] = useState(initialStatus)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | undefined
    let cancelled = false

    // The Realtime socket must carry the admin's JWT *before* the postgres_changes
    // subscription registers — otherwise it registers as `anon` (no sub claim) and the
    // admin RLS check (is_active_admin) evaluates false, so changes are silently dropped.
    // createBrowserClient sets the token asynchronously via onAuthStateChange, which races
    // the mount, so we set it explicitly first.
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      await supabase.realtime.setAuth(data.session?.access_token)
      if (cancelled) return

      channel = supabase
        .channel(`support-chat-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_conversation_messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const next = payload.new as Message
            setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]))
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'support_conversations', filter: `id=eq.${conversationId}` },
          (payload) => {
            setStatus(payload.new.status as 'open' | 'closed')
          },
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    setError(null)
    startTransition(async () => {
      try {
        await sendReplyAction(conversationId, text)
        setDraft('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send reply.')
      }
    })
  }

  function handleClose() {
    setError(null)
    startTransition(async () => {
      try {
        await closeConversationAction(conversationId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to close conversation.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-[14px] border border-salty-border bg-warm-white px-4 py-3">
        <span className="text-[13px] font-medium text-salty-text capitalize">{status}</span>
        {status === 'open' && (
          <Button size="sm" variant="outline" onClick={handleClose} disabled={isPending}>
            Close conversation
          </Button>
        )}
      </div>

      <div className="rounded-[14px] border border-salty-border bg-warm-white p-4 space-y-3 max-h-[55vh] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-center text-salty-muted py-8 text-sm">No messages yet</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-[12px] px-3 py-2 text-[13px] ${
                  m.sender_type === 'admin' ? 'bg-ember text-white' : 'bg-stone text-salty-text'
                }`}
              >
                <p>{m.message}</p>
                <p className={`mt-1 text-[10px] ${m.sender_type === 'admin' ? 'text-white/70' : 'text-salty-muted'}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-[13px] text-[#BF4A3A]">{error}</p>}

      {status === 'open' ? (
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a reply…"
            className="min-h-[44px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button onClick={handleSend} disabled={isPending || !draft.trim()}>
            Send
          </Button>
        </div>
      ) : (
        <p className="text-center text-[13px] text-salty-muted py-2">This conversation is closed.</p>
      )}
    </div>
  )
}
