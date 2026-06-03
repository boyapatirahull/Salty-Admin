-- Track every admin login for the profile page "Recent logins" feature
CREATE TABLE IF NOT EXISTS public.admin_login_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   UUID        NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX admin_login_history_admin_id_idx    ON public.admin_login_history(admin_id);
CREATE INDEX admin_login_history_created_at_idx  ON public.admin_login_history(created_at DESC);

ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_login_history" ON public.admin_login_history
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
