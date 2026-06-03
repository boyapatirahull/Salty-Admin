'use client'

import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

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
          <h2 className="mb-1 font-sora text-[15px] font-bold text-salty-text">Sign in</h2>
          <p className="mb-5 text-[13px] text-salty-muted">Enter your admin credentials to continue</p>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-salty-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@salty.app"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-salty-border bg-cream px-3 py-2 text-[13px] text-salty-text placeholder:text-salty-muted focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/20 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-salty-text">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
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
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
