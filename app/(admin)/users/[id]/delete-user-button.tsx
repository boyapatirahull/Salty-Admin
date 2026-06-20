'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { deleteUserAction } from '../actions'

export function DeleteUserButton({
  userId, userEmail, alsoAdmin = false,
}: { userId: string; userEmail: string; alsoAdmin?: boolean }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteUserAction(userId)
        setOpen(false)
        router.push('/users')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete user.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{userEmail}</strong> and all their data (tickets, friends, gmail connection). This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {alsoAdmin && (
          <div className="rounded-lg border border-[#F0C4C4] bg-[#FDEDED] px-3 py-2.5 text-[13px] text-[#BF4A3A]">
            This email is also used for an admin account. Deleting this user will remove their Supabase
            login, so their admin access will be deleted as well — they will no longer be able to sign
            into this admin panel either.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-[#F0C4C4] bg-[#FDEDED] px-3 py-2.5 text-[13px] text-[#BF4A3A]">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
