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
  revalidatePath('/photos')
}
