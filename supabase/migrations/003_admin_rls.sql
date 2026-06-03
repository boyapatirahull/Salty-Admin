ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Deny all non-service-role access. Service role bypasses RLS by default in Supabase.
CREATE POLICY "admin_users_deny_non_service"
  ON public.admin_users AS RESTRICTIVE
  USING (false);

CREATE POLICY "admin_audit_log_deny_non_service"
  ON public.admin_audit_log AS RESTRICTIVE
  USING (false);
