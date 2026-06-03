-- Admin users table (standalone, not linked to public.users)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  access_level  INTEGER NOT NULL DEFAULT 4
                  CHECK (access_level BETWEEN 1 AND 4),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  invited_by    UUID REFERENCES public.admin_users(id),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Audit log for all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    UUID NOT NULL REFERENCES public.admin_users(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast admin lookups by email
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users(email);

-- Index for fast audit log queries by admin
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_id_idx ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log(created_at DESC);

-- Seed: super admin bootstrap
INSERT INTO public.admin_users (email, full_name, access_level)
VALUES ('wassup1799@gmail.com', 'Rahul', 1)
ON CONFLICT (email) DO NOTHING;
