'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** No UI — just refreshes the server-rendered list when conversations/messages change. */
export function RealtimeRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | undefined
    let channel: ReturnType<typeof supabase.channel> | undefined
    let cancelled = false

    function scheduleRefresh() {
      clearTimeout(timeout)
      timeout = setTimeout(() => router.refresh(), 300)
    }

    // Authenticate the Realtime socket with the admin's JWT before subscribing, otherwise the
    // subscription registers as `anon` and the admin RLS check drops every change. See thread-view.tsx.
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      await supabase.realtime.setAuth(data.session?.access_token)
      if (cancelled) return

      channel = supabase
        .channel('support-chat-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversation_messages' }, scheduleRefresh)
        .subscribe()
    })()

    return () => {
      cancelled = true
      clearTimeout(timeout)
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
