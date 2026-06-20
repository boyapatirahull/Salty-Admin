'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trash2, Loader2, Video, ExternalLink } from 'lucide-react'
import { deletePhotoAction } from './actions'

interface Photo {
  id: string
  ticket_id: string
  user_id: string
  user_email: string
  storage_url: string | null
  media_type: string
  match_method: string | null
  match_confidence: number | null
  taken_at: string | null
}

const METHOD_COLOR: Record<string, string> = {
  auto:          'bg-[#EAF4EE] text-[#3E8A5A]',
  manual:        'bg-stone text-salty-secondary',
  library_scan:  'bg-[#EBF2FA] text-[#3A72A8]',
  ai_verified:   'bg-gold-light text-gold',
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()

  function confirmDelete() {
    start(async () => {
      await deletePhotoAction(photo.id)
      setConfirming(false)
    })
  }

  return (
    <div className="group relative overflow-hidden rounded-[12px] border border-salty-border bg-warm-white">
      <div className="relative aspect-square bg-stone">
        {photo.storage_url ? (
          photo.media_type === 'video' ? (
            <video src={photo.storage_url} className="h-full w-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.storage_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-salty-muted">
            <Video className="h-6 w-6" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-md bg-white/90 p-1.5 text-[#BF4A3A] hover:bg-white transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={confirmDelete}
                disabled={pending}
                className="rounded-md bg-[#BF4A3A] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#A53D30]"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </button>
              <button onClick={() => setConfirming(false)} className="rounded-md bg-white/90 px-2 py-1 text-[11px] text-salty-secondary">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-2.5 space-y-1">
        <Link
          href={`/users/${photo.user_id}`}
          className="flex items-center gap-1 text-[11px] text-salty-secondary hover:text-ember truncate"
        >
          <span className="truncate">{photo.user_email}</span>
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </Link>
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${METHOD_COLOR[photo.match_method ?? ''] ?? 'bg-stone text-salty-muted'}`}>
            {photo.match_method ?? 'unknown'}
          </span>
          {photo.match_confidence !== null && (
            <span className="text-[10px] font-semibold text-salty-text">{Math.round(photo.match_confidence * 100)}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return <p className="py-10 text-center text-[13px] text-salty-muted">No photos found</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {photos.map(p => <PhotoCard key={p.id} photo={p} />)}
    </div>
  )
}
