import { createServiceClient } from '@/lib/supabase/server'
import { hashInviteToken } from '@/lib/invite'
import { SetPasswordForm } from './set-password-form'

interface Props {
  searchParams: Promise<{ token?: string }>
}

// Never cache a magic-link landing page — the token is single-use and the DB
// state changes underneath us.
export const dynamic = 'force-dynamic'

function InviteMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-ember font-sora text-[22px] font-bold text-white">S</div>
          <div className="text-center">
            <h1 className="font-sora text-[22px] font-bold tracking-tight text-salty-text">Salty Admin</h1>
            <p className="mt-1 text-[13px] text-salty-muted">Internal team access only</p>
          </div>
        </div>
        <div className="rounded-[14px] border border-salty-border bg-warm-white p-6 shadow-sm text-center">
          <h2 className="mb-1 font-sora text-[15px] font-bold text-salty-text">{title}</h2>
          <p className="text-[13px] text-salty-muted">{message}</p>
          <a href="/login" className="mt-4 inline-block text-[13px] font-medium text-ember hover:underline">Go to sign in →</a>
        </div>
      </div>
    </div>
  )
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) return <InviteMessage title="Invalid link" message="This invite link is missing its token." />

  const db = createServiceClient()
  const hash = hashInviteToken(token)

  const { data: admin } = await db
    .from('admin_users')
    .select('email, full_name, is_active, invite_token_expires_at, admin_password_hash')
    .eq('invite_token_hash', hash)
    .maybeSingle()

  if (!admin) {
    return <InviteMessage title="Invalid link" message="This invite link is invalid or has already been used." />
  }
  if (!admin.is_active) {
    return <InviteMessage title="Account disabled" message="This admin account is inactive. Ask a Super Admin for help." />
  }
  if (admin.admin_password_hash) {
    return <InviteMessage title="Already set up" message="A password has already been set for this account. Sign in from the login page." />
  }
  if (!admin.invite_token_expires_at || new Date(admin.invite_token_expires_at) < new Date()) {
    return <InviteMessage title="Link expired" message="This invite link has expired. Ask a Super Admin to send you a new one." />
  }

  return <SetPasswordForm token={token} email={admin.email} fullName={admin.full_name} />
}
