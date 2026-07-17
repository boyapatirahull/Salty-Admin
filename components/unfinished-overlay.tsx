import { Construction } from 'lucide-react'

/**
 * Veils a page that is still being finished: the real content stays visible but
 * faded and non-interactive, under a "check back later" card.
 *
 * `inert` (not just pointer-events-none) so the content is unreachable by
 * keyboard and screen readers too, and not merely unclickable by mouse.
 *
 * This is a "not ready yet" signal, NOT a security boundary — the markup is
 * still in the page and the veil can be removed from devtools. Anything that
 * must actually be prevented has to be enforced in the server action.
 */
export function UnfinishedOverlay({
  children,
  message,
  compact = false,
}: {
  children: React.ReactNode
  message?: string
  compact?: boolean
}) {
  const card = (
    <div className="pointer-events-auto flex max-w-[380px] flex-col items-center rounded-[14px] border border-salty-border bg-warm-white px-7 py-6 text-center shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ember-light">
        <Construction className="h-5 w-5 text-ember" />
      </div>
      <p className="mt-3 font-sora text-[15px] font-bold text-salty-text">Not ready yet</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-salty-muted">
        {message ?? "This page isn't completely built yet. Check back later."}
      </p>
    </div>
  )

  return (
    <div className="relative isolate">
      <div inert className="select-none opacity-40 blur-[1.5px]">
        {children}
      </div>

      {compact ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/50 px-4">
          {card}
        </div>
      ) : (
        // inset-0 spans the full content height; the inner sticky keeps the card
        // in view if the faded content behind it is taller than the viewport.
        <div className="absolute inset-0 z-10 bg-cream/50">
          <div className="sticky top-0 flex justify-center px-6 pt-24">{card}</div>
        </div>
      )}
    </div>
  )
}
