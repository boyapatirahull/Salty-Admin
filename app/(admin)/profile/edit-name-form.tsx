'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from './actions'

export function EditNameForm({ currentName }: { currentName: string | null }) {
  const [value, setValue]   = useState(currentName ?? '')
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    if (!value.trim()) { setError('Name cannot be empty.'); return }
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateProfileAction(value.trim())
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save.')
      }
    })
  }

  const dirty = value.trim() !== (currentName ?? '').trim()

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[13px]">Display name</Label>
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={e => { setValue(e.target.value); setSaved(false) }}
            placeholder="Your full name"
            className="max-w-xs text-[13px]"
            onKeyDown={e => e.key === 'Enter' && dirty && handleSave()}
          />
          <Button
            size="sm"
            disabled={!dirty || pending}
            onClick={handleSave}
            className="gap-1.5"
          >
            {pending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
              : saved
                ? <><Check className="h-3.5 w-3.5" />Saved</>
                : 'Save'
            }
          </Button>
        </div>
      </div>
      {error && <p className="text-[12px] text-[#BF4A3A]">{error}</p>}
    </div>
  )
}
