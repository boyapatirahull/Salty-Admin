'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Trash2, Loader2, ExternalLink } from 'lucide-react'

interface Row {
  id: string
  ticket_id: string
  user_email: string
  text: string
  created_at: string
}

export function ContentTable({
  rows,
  emptyLabel,
  onDelete,
}: {
  rows: Row[]
  emptyLabel: string
  onDelete: (id: string) => Promise<void>
}) {
  const [pending, start] = useTransition()

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-salty-border bg-cream">
          {['Content', 'User', 'Ticket', 'Date', ''].map(h => (
            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px] text-salty-muted">{emptyLabel}</td></tr>
        ) : (
          rows.map(r => (
            <tr key={r.id} className="border-b border-salty-border last:border-0 hover:bg-cream">
              <td className="px-4 py-3 text-[13px] text-salty-text max-w-sm"><p className="truncate">{r.text}</p></td>
              <td className="px-4 py-3 text-[12px] text-salty-secondary">{r.user_email}</td>
              <td className="px-4 py-3 text-[12px] text-salty-muted font-mono">{r.ticket_id.slice(0, 8)}…</td>
              <td className="px-4 py-3 text-[12px] text-salty-secondary whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => start(() => onDelete(r.id))}
                  disabled={pending}
                  className="rounded-md p-1.5 text-salty-muted hover:bg-[#FDEDED] hover:text-[#BF4A3A] transition-colors"
                  title="Delete"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
