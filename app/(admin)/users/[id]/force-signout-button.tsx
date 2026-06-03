'use client'

import { useState, useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { forceSignOutAction } from '../actions'

export function ForceSignOutButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await forceSignOutAction(userId)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LogOut className="h-4 w-4" />
          Force sign out
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Force sign out</DialogTitle>
          <DialogDescription>
            This will immediately invalidate all active sessions for <strong>{userEmail}</strong> across all devices. They will need to log in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={handleSignOut} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Signing out…' : 'Force sign out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
