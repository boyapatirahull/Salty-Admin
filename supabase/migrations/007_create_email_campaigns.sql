-- Email campaigns sent from the admin panel (product-update / announcement broadcasts).
-- One row per bulk send. Per-user one-off emails are not logged here (they go to admin_audit_log).

create table if not exists public.email_campaigns (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid,
  subject         text not null,
  body            text not null,
  segment         jsonb,               -- { type: 'all' | 'tier' | 'active', tier?, activeDays? }
  recipient_count integer not null default 0,
  sent_count      integer not null default 0,
  failed_count    integer not null default 0,
  created_at      timestamptz not null default now()
);

-- Admin-only table; the admin app talks to it via the service-role key, which
-- bypasses RLS. Enable RLS with no policies so nothing else can read it.
alter table public.email_campaigns enable row level security;

create index if not exists email_campaigns_created_at_idx
  on public.email_campaigns (created_at desc);
