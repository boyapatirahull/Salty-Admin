'use client'

import { useTransition } from 'react'
import { changeTierAction } from '../actions'

const TIERS = ['free', 'premium', 'family']
const TIER_COLORS: Record<string, string> = {
  free:    'bg-stone text-salty-muted',
  premium: 'bg-gold-light text-gold',
  family:  'bg-ember-light text-ember',
}

export function TierSelect({ userId, currentTier }: { userId: string; currentTier: string }) {
  const [pending, start] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${TIER_COLORS[currentTier] ?? 'bg-stone text-salty-muted'}`}>
        {currentTier}
      </span>
      <select
        defaultValue={currentTier}
        onChange={e => start(() => changeTierAction(userId, e.target.value))}
        disabled={pending}
        className="rounded-lg border border-salty-border bg-cream px-2 py-0.5 text-[12px] focus:border-ember focus:outline-none"
      >
        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {pending && <span className="text-[11px] text-salty-muted">Saving…</span>}
    </div>
  )
}
