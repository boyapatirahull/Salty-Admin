'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export function ActionFilter({ actions, current }: { actions: string[]; current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, start] = useTransition()

  return (
    <select
      defaultValue={current}
      onChange={e => {
        start(() => {
          const p = new URLSearchParams(window.location.search)
          if (e.target.value) p.set('action', e.target.value)
          else p.delete('action')
          p.delete('page')
          router.push(`${pathname}?${p.toString()}`)
        })
      }}
      className="rounded-lg border border-salty-border bg-cream px-3 py-2 text-[13px] text-salty-text focus:border-ember focus:outline-none font-sans"
    >
      <option value="">All actions</option>
      {actions.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  )
}
