import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportsTable } from './imports-table'

export default async function PendingImportsPage() {
  await requireAdmin(2)
  const db = createServiceClient()

  const { data: imports } = await db
    .from('pending_imports')
    .select('id, user_id, source, status, confidence, raw_data, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const all = imports ?? []
  const pending = all.filter((i) => i.status === 'pending')
  const approved = all.filter((i) => i.status === 'approved')
  const rejected = all.filter((i) => i.status === 'rejected')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pending Imports</h1>
        <span className="text-sm text-muted-foreground">{pending.length} pending review</span>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <ImportsTable rows={pending} showActions={true} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved">
          <Card>
            <CardContent className="p-0">
              <ImportsTable rows={approved} showActions={false} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card>
            <CardContent className="p-0">
              <ImportsTable rows={rejected} showActions={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
