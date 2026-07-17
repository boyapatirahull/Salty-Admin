import type { ReactNode } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { maskEmail } from '@/lib/privacy'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'
import { unsubscribeAction } from './actions'

interface Props {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ t?: string; done?: string }>
}

export const dynamic = 'force-dynamic'

function Card({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-ember font-sora text-[22px] font-bold text-white">S</div>
          <div className="text-center">
            <h1 className="font-sora text-[22px] font-bold tracking-tight text-salty-text">Salty</h1>
            <p className="mt-1 text-[13px] text-salty-muted">Email preferences</p>
          </div>
        </div>
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-6 text-center shadow-sm">
          <h2 className="mb-1 font-sora text-[15px] font-bold text-salty-text">{title}</h2>
          <p className="text-[13px] leading-5 text-salty-muted">{body}</p>
          {cta}
        </div>
      </div>
    </div>
  )
}

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { userId } = await params
  const { t, done } = await searchParams

  if (!t || !verifyUnsubscribeToken(userId, t)) {
    return (
      <Card
        title="Invalid link"
        body="This unsubscribe link is invalid or has been tampered with."
      />
    )
  }

  const db = createServiceClient()
  const { data: user } = await db
    .from('users')
    .select('email, unsubscribed_from_marketing')
    .eq('id', userId)
    .maybeSingle()

  if (!user) {
    return (
      <Card
        title="Invalid link"
        body="This unsubscribe link is invalid or has been tampered with."
      />
    )
  }

  if (done === '1' || user.unsubscribed_from_marketing) {
    return (
      <Card
        title="You're unsubscribed"
        body="You won't receive further marketing emails from Salty. Account-related emails (like password resets) will still come through."
      />
    )
  }

  const email = typeof user.email === 'string' ? maskEmail(user.email) : 'this account'

  return (
    <Card
      title="Unsubscribe from Salty emails?"
      body={`We'll stop sending marketing emails to ${email}. Account-related emails (like password resets) will still come through.`}
      cta={
        <form action={unsubscribeAction.bind(null, userId, t)} className="mt-4">
          <button
            type="submit"
            className="text-[13px] font-medium text-ember hover:underline"
          >
            Unsubscribe
          </button>
        </form>
      }
    />
  )
}
