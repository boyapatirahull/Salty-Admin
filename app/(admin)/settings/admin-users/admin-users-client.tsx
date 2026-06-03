'use client'

import { useState, useTransition } from 'react'
import { Loader2, UserPlus, Shield } from 'lucide-react'
import { inviteAdminAction, changeAccessLevelAction, toggleActiveAction } from './actions'
import { ACCESS_LEVEL_LABELS } from '@/types/admin'

interface AdminRow {
  id: string
  email: string
  full_name: string | null
  access_level: number
  is_active: boolean
  last_login_at: string | null
  created_at: string
  invited_by_email?: string
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-ember-light text-ember',
  2: 'bg-[#EBF2FA] text-[#3A72A8]',
  3: 'bg-[#EAF4EE] text-[#3E8A5A]',
  4: 'bg-stone text-salty-muted',
}

const inputCls = 'w-full rounded-lg border border-salty-border bg-cream px-3 py-2 text-[13px] text-salty-text placeholder:text-salty-muted focus:border-ember focus:outline-none font-sans'
const labelCls = 'block text-[12px] font-semibold uppercase tracking-[0.06em] text-salty-muted mb-1.5'

export function AdminUsersClient({ rows, currentAdminId }: { rows: AdminRow[]; currentAdminId: string }) {
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [level, setLevel] = useState(4)
  const [result, setResult] = useState<{ type: 'success'|'error'; msg: string }|null>(null)
  const [pending, startTransition] = useTransition()

  function invite() {
    if (!email || !fullName) return setResult({ type: 'error', msg: 'Email and name are required.' })
    setResult(null)
    startTransition(async () => {
      try {
        await inviteAdminAction(email, fullName, level)
        setResult({ type: 'success', msg: `${email} invited — they'll receive a password setup email.` })
        setEmail(''); setFullName(''); setLevel(4); setShowInvite(false)
      } catch (e) {
        setResult({ type: 'error', msg: (e as Error).message })
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-salty-muted">{rows.length} admin account{rows.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowInvite(v => !v)}
          className="flex items-center gap-2 rounded-lg bg-ember px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#D44D15] transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Invite Admin
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-5 space-y-4 max-w-lg">
          <h3 className="font-sora text-[14px] font-bold text-salty-text">Invite new admin</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
            </div>
          </div>
          <div className="max-w-xs">
            <label className={labelCls}>Access Level</label>
            <select value={level} onChange={e => setLevel(Number(e.target.value))} className={inputCls}>
              {[2,3,4].map(l => <option key={l} value={l}>{l} — {ACCESS_LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
          {result && (
            <div className={`rounded-lg border px-3 py-2.5 text-[13px] ${result.type === 'success' ? 'border-[#B8D9C5] bg-[#EAF4EE] text-[#3E8A5A]' : 'border-[#F0C4C4] bg-[#FDEDED] text-[#BF4A3A]'}`}>
              {result.msg}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={invite} disabled={pending} className="flex items-center gap-2 rounded-lg bg-ember px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#D44D15] disabled:opacity-60">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {pending ? 'Inviting…' : 'Send Invite'}
            </button>
            <button onClick={() => setShowInvite(false)} className="rounded-lg border border-salty-border px-4 py-2 text-[13px] text-salty-secondary hover:bg-cream">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-salty-border bg-warm-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-salty-border bg-cream">
              {['Admin','Access Level','Status','Last Login','Invited By','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-salty-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <AdminUserRow key={row.id} row={row} isSelf={row.id === currentAdminId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminUserRow({ row, isSelf }: { row: AdminRow; isSelf: boolean }) {
  const [pending, startTransition] = useTransition()
  const initials = (row.full_name ?? row.email).slice(0, 2).toUpperCase()

  function changeLevel(val: string) {
    startTransition(() => changeAccessLevelAction(row.id, Number(val)))
  }
  function toggle() {
    startTransition(() => toggleActiveAction(row.id, !row.is_active))
  }

  return (
    <tr className="border-b border-salty-border last:border-0 hover:bg-cream">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E8581A, #C8A96E)' }}>
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-medium text-salty-text">{row.full_name ?? '—'}</p>
            <p className="text-[11px] text-salty-muted">{row.email}</p>
          </div>
          {isSelf && <span className="ml-1 rounded-full bg-ember-light px-2 py-0.5 text-[10px] font-semibold text-ember">You</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_COLORS[row.access_level]}`}>
            {ACCESS_LEVEL_LABELS[row.access_level]}
          </span>
        ) : (
          <select
            value={row.access_level}
            onChange={e => changeLevel(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-salty-border bg-cream px-2 py-1 text-[12px] focus:border-ember focus:outline-none"
          >
            {[1,2,3,4].map(l => <option key={l} value={l}>{l} — {ACCESS_LEVEL_LABELS[l]}</option>)}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.is_active ? 'bg-[#EAF4EE] text-[#3E8A5A]' : 'bg-[#FDEDED] text-[#BF4A3A]'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-[12px] text-salty-secondary">
        {row.last_login_at ? new Date(row.last_login_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-[12px] text-salty-secondary">{row.invited_by_email ?? '—'}</td>
      <td className="px-4 py-3">
        {!isSelf && (
          <button
            onClick={toggle}
            disabled={pending}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
              row.is_active
                ? 'border-[#F0C4C4] bg-[#FDEDED] text-[#BF4A3A] hover:bg-[#F5D0D0]'
                : 'border-[#B8D9C5] bg-[#EAF4EE] text-[#3E8A5A] hover:bg-[#C9E8D6]'
            }`}
          >
            {pending ? '…' : row.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        )}
      </td>
    </tr>
  )
}
