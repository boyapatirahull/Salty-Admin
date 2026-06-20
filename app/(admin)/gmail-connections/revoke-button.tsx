'use client'

import { useState, useTransition } from 'react'
import { Loader2, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { revokeGmailConnectionAction, revokeImapConnectionAction } from './actions'

interface Props {
  userId: string
  userEmail: string
  kind: 'gmail' | 'imap'
  providerLabel: string
}

export function RevokeButton({ userId, userEmail, kind, providerLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleRevoke() {
    startTransition(async () => {
      if (kind === 'gmail') await revokeGmailConnectionAction(userId)
      else await revokeImapConnectionAction(userId)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-salty-border text-salty-secondary hover:bg-stone h-7 gap-1 text-[11px]">
          <WifiOff className="h-3.5 w-3.5" />
          Revoke
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke {providerLabel} connection</DialogTitle>
          <DialogDescription>
            This will disconnect {providerLabel} from <strong>{userEmail}</strong>. The user will need to reconnect to resume email imports.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Revoking…' : 'Revoke connection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
