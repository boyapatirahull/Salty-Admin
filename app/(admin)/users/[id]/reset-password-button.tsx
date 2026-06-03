'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { sendPasswordResetAction } from '../actions'

export function ResetPasswordButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleReset() {
    startTransition(async () => {
      await sendPasswordResetAction(userId)
      setDone(true)
    })
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setDone(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4" />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send password reset</DialogTitle>
          <DialogDescription>
            {done
              ? `A password reset email has been sent to ${userEmail}.`
              : `This will email ${userEmail} a link to set a new password.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {done ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
              <Button onClick={handleReset} disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? 'Sending…' : 'Send reset email'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
