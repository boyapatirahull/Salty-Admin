'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { acceptInviteAction } from './actions'

interface Props {
  token: string
  email: string
  fullName: string | null
}

interface State {
  ok?: true
  error?: string
}

export function SetPasswordForm({ token, email, fullName }: Props) {
  const router = useRouter()
  const [state, action, pending] = useActionState(
    async (_: State | null, formData: FormData): Promise<State> => {
      const password = formData.get('password')
      const confirmPassword = formData.get('confirmPassword')

      if (typeof password !== 'string' || typeof confirmPassword !== 'string' || !password || !confirmPassword) {
        return { error: 'New password and confirmation are required.' }
      }
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
      }
      if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
      }

      try {
        await acceptInviteAction(token, password)
        return { ok: true }
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to set password.' }
      }
    },
    null,
  )

  useEffect(() => {
    if (state?.ok) router.push('/login?welcome=1')
  }, [router, state?.ok])

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-ember font-sora text-[22px] font-bold text-white">
            S
          </div>
          <div className="text-center">
            <h1 className="font-sora text-[22px] font-bold tracking-tight text-salty-text">Salty Admin</h1>
            <p className="mt-1 text-[13px] text-salty-muted">Internal team access only</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-6 shadow-sm">
          <h2 className="mb-1 font-sora text-[15px] font-bold text-salty-text">Set password</h2>
          <p className="mb-5 text-[13px] text-salty-muted">Welcome, {fullName ?? email}. Create your admin password to continue</p>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-salty-text">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-salty-border bg-cream px-3 py-2 text-[13px] text-salty-text placeholder:text-salty-muted focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/20 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-salty-text">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-salty-border bg-cream px-3 py-2 text-[13px] text-salty-text placeholder:text-salty-muted focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/20 transition-colors"
              />
            </div>

            {state?.error && (
              <div className="rounded-lg border border-[#F0C4C4] bg-[#FDEDED] px-3 py-2.5 text-[13px] text-[#BF4A3A]">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#D44D15] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? 'Setting password…' : 'Set password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
