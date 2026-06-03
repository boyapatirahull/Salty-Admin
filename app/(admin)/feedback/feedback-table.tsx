'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { updateFeedbackStatus } from './actions'

interface FeedbackRow {
  id: string
  category: string
  rating: number
  message: string
  status: string
  created_at: string
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  unread: 'default',
  read: 'secondary',
  actioned: 'outline',
}

export function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const [, startTransition] = useTransition()

  function markStatus(id: string, status: 'read' | 'actioned') {
    startTransition(() => updateFeedbackStatus(id, status))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No feedback</TableCell>
          </TableRow>
        ) : (
          rows.map((fb) => (
            <TableRow key={fb.id}>
              <TableCell className="font-medium">{fb.category}</TableCell>
              <TableCell>{'★'.repeat(fb.rating)}<span className="text-muted-foreground">{'☆'.repeat(5 - fb.rating)}</span></TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-sm">{fb.message}</p>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[fb.status] ?? 'outline'} className="text-xs">
                  {fb.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(fb.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {fb.status === 'unread' && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markStatus(fb.id, 'read')}>
                      Mark read
                    </Button>
                  )}
                  {fb.status !== 'actioned' && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markStatus(fb.id, 'actioned')}>
                      Action
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
