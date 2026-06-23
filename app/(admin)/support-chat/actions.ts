'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID, assertString } from '@/lib/validate'

async function callNotifFn(userId: string, title: string, body: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ userId, title, body }),
  })
  if (!res.ok) throw new Error(`Notification delivery failed for user ${userId.slice(0, 8)}.`)
}

export async function sendReplyAction(conversationId: string, message: string) {
  const admin = await requireAdmin(3)
  const cid   = assertUUID(conversationId, 'Conversation ID')
  const msg   = assertString(message, 'Message', 2000)
  const db    = createServiceClient()

  const { data: convo } = await db.from('support_conversations').select('id, user_id, status').eq('id', cid).single()
  if (!convo) throw new Error('Conversation not found.')
  if (convo.status === 'closed') throw new Error('This conversation is closed.')

  await db.from('support_conversation_messages').insert({
    conversation_id: cid,
    sender_type: 'admin',
    sender_id: admin.id,
    message: msg,
  })
  await db.from('support_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', cid)
  await logAudit(admin.id, 'support_reply_sent', 'support_conversation', cid)

  // Push is a best-effort secondary channel for when the user isn't in the app — the
  // reply itself is already saved, so a delivery failure here shouldn't fail the action.
  try {
    await callNotifFn(convo.user_id, 'New reply from Salty Support', msg.slice(0, 150))
  } catch {
    // swallow — reply is saved either way
  }

  revalidatePath('/support-chat')
  revalidatePath(`/support-chat/${cid}`)
  return { ok: true }
}

export async function closeConversationAction(conversationId: string) {
  const admin = await requireAdmin(3)
  const cid   = assertUUID(conversationId, 'Conversation ID')
  const db    = createServiceClient()

  const { data: convo } = await db.from('support_conversations').select('id, status').eq('id', cid).single()
  if (!convo) throw new Error('Conversation not found.')
  if (convo.status === 'closed') return { ok: true }

  await db.from('support_conversations').update({
    status: 'closed',
    closed_by: 'admin',
    closed_at: new Date().toISOString(),
  }).eq('id', cid)
  await logAudit(admin.id, 'support_conversation_closed', 'support_conversation', cid)

  revalidatePath('/support-chat')
  revalidatePath(`/support-chat/${cid}`)
  return { ok: true }
}
