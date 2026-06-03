'use client'

import { createContext, useContext } from 'react'
import type { AdminUser } from '@/types/admin'

const AdminContext = createContext<AdminUser | null>(null)

export function AdminProvider({ admin, children }: { admin: AdminUser; children: React.ReactNode }) {
  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminUser {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}

export function useAccessLevel(): number {
  return useAdmin().access_level
}
