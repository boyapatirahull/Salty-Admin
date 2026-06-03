import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  redirect('/login')
}
