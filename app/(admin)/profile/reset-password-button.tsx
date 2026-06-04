'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePasswordAction } from './actions'

export function ChangePasswordForm() {
  const [newPass, setNewPass]       = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()

  const mismatch = confirm.length > 0 && newPass !== confirm
  const canSave  = newPass.length >= 8 && newPass === confirm && !pending

  function handleSave() {
    if (!canSave) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updatePasswordAction(newPass)
        setSaved(true)
        setNewPass('')
        setConfirm('')
        setTimeout(() => setSaved(false), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update password.')
      }
    })
  }

  return (
    <div className="space-y-3 max-w-xs">
      <div className="space-y-1.5">
        <Label className="text-[13px]">New password</Label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            value={newPass}
            onChange={e => { setNewPass(e.target.value); setSaved(false) }}
            placeholder="Min. 8 characters"
            className="text-[13px] pr-9"
          />
          <button
            type="button"
            onClick={() => setShowNew(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-salty-muted hover:text-salty-text"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[13px]">Confirm password</Label>
        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setSaved(false) }}
            placeholder="Re-enter new password"
            className={`text-[13px] pr-9 ${mismatch ? 'border-[#BF4A3A]' : ''}`}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-salty-muted hover:text-salty-text"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {mismatch && <p className="text-[12px] text-[#BF4A3A]">Passwords do not match.</p>}
      </div>

      <Button
        size="sm"
        disabled={!canSave}
        onClick={handleSave}
        className="gap-1.5"
      >
        {pending
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
          : saved
            ? <><Check className="h-3.5 w-3.5" />Password updated</>
            : 'Update password'
        }
      </Button>

      {error && <p className="text-[12px] text-[#BF4A3A]">{error}</p>}
    </div>
  )
}
