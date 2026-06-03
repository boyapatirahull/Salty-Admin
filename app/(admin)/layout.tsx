import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminProvider } from '@/components/admin-provider'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import type { AdminUser } from '@/types/admin'

async function getLayoutCounts() {
  const db = createServiceClient()
  const [
    { count: users },
    { count: tickets },
    { count: pendingImports },
    { count: unreadFeedback },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('tickets').select('*', { count: 'exact', head: true }),
    db.from('pending_imports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
  ])
  return {
    users: users ?? 0,
    tickets: tickets ?? 0,
    pendingImports: pendingImports ?? 0,
    unreadFeedback: unreadFeedback ?? 0,
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/login?error=unauthorized')

  const counts = await getLayoutCounts()

  return (
    <AdminProvider admin={admin as AdminUser}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar counts={counts} />
        <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: 220 }}>
          <Header pendingImports={counts.pendingImports} unreadFeedback={counts.unreadFeedback} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  )
}
