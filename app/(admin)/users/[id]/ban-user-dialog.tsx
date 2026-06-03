'use client'

import { useState, useTransition } from 'react'
import { Ban, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { banUserAction } from '../actions'

const DURATIONS = [
  { label: '1 day',     value: '1d'   },
  { label: '3 days',    value: '3d'   },
  { label: '7 days',    value: '7d'   },
  { label: '30 days',   value: '30d'  },
  { label: 'Permanent', value: 'perm' },
]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function BanUserDialog({
  userId,
  userEmail,
  bannedUntil,
}: {
  userId: string
  userEmail: string
  bannedUntil: string | null
}) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState('7d')
  const [pending, startTransition] = useTransition()

  const isBanned = bannedUntil !== null && new Date(bannedUntil) > new Date()

  function handleBan() {
    startTransition(async () => {
      const until = duration === 'perm'
        ? '2099-01-01T00:00:00Z'
        : duration === '1d'  ? addDays(1)
        : duration === '3d'  ? addDays(3)
        : duration === '7d'  ? addDays(7)
        : addDays(30)
      await banUserAction(userId, until)
      setOpen(false)
    })
  }

  function handleUnban() {
    startTransition(async () => {
      await banUserAction(userId, null)
      setOpen(false)
    })
  }

  if (isBanned) {
    const isPermBan = bannedUntil && new Date(bannedUntil).getFullYear() >= 2099
    const banLabel = isPermBan
      ? 'Permanently banned'
      : `Banned until ${new Date(bannedUntil!).toLocaleDateString()}`

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="border-[#F0C4C4] text-[#BF4A3A] hover:bg-[#FDEDED]">
            <ShieldCheck className="h-4 w-4" />
            Lift ban
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lift ban</DialogTitle>
            <DialogDescription>
              <strong>{userEmail}</strong> is currently suspended ({banLabel}). Lift the ban to restore access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={handleUnban} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? 'Lifting…' : 'Lift ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-salty-border text-salty-secondary hover:bg-stone">
          <Ban className="h-4 w-4" />
          Suspend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend account</DialogTitle>
          <DialogDescription>
            Suspend <strong>{userEmail}</strong> for how long? The user will be blocked from signing in during this period.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-[13px]">Duration</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium border transition-colors ${
                  duration === d.value
                    ? 'bg-ember text-white border-ember'
                    : 'bg-stone text-salty-secondary border-salty-border hover:bg-cream'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button
            onClick={handleBan}
            disabled={pending}
            className="bg-[#BF4A3A] hover:bg-[#A83C2E] text-white border-0"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Suspending…' : 'Suspend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
