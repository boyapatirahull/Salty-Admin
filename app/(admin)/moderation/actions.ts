'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { assertUUID } from '@/lib/validate'

const STORAGE_BUCKET = 'ticket-photos'

function pathFromStorageUrl(url: string): string | null {
  const marker = `/${STORAGE_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export async function deletePhotoAction(photoId: string) {
  const admin = await requireAdmin(3)
  const pid   = assertUUID(photoId, 'Photo ID')
  const db    = createServiceClient()

  const { data: photo } = await db.from('photos').select('id, storage_url, ticket_id').eq('id', pid).single()
  if (!photo) throw new Error('Photo not found.')

  if (photo.storage_url) {
    const path = pathFromStorageUrl(photo.storage_url)
    if (path) await db.storage.from(STORAGE_BUCKET).remove([path])
  }

  await db.from('photos').delete().eq('id', pid)
  await logAudit(admin.id, 'delete_photo', 'photo', pid, { ticket_id: photo.ticket_id })
  revalidatePath('/moderation')
}

export async function deleteNoteAction(noteId: string) {
  const admin = await requireAdmin(3)
  const nid   = assertUUID(noteId, 'Note ID')
  const db    = createServiceClient()

  const { data: note } = await db.from('ticket_notes').select('id, ticket_id').eq('id', nid).single()
  if (!note) throw new Error('Note not found.')

  await db.from('ticket_notes').delete().eq('id', nid)
  await logAudit(admin.id, 'delete_ticket_note', 'ticket_note', nid, { ticket_id: note.ticket_id })
  revalidatePath('/moderation')
}

export async function deleteTagAction(tagId: string) {
  const admin = await requireAdmin(3)
  const tid   = assertUUID(tagId, 'Tag ID')
  const db    = createServiceClient()

  const { data: tag } = await db.from('ticket_tags').select('id, ticket_id').eq('id', tid).single()
  if (!tag) throw new Error('Tag not found.')

  await db.from('ticket_tags').delete().eq('id', tid)
  await logAudit(admin.id, 'delete_ticket_tag', 'ticket_tag', tid, { ticket_id: tag.ticket_id })
  revalidatePath('/moderation')
}
