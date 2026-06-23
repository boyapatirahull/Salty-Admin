-- Two-way, real-time support chat. Replaces the one-shot support_messages intake
-- (mobile app's old "Support" mode) with a proper conversation/message thread model.
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_by         TEXT        CHECK (closed_by IN ('user', 'admin')),
  closed_at         TIMESTAMPTZ,
  assigned_admin_id UUID, -- no FK on purpose — admin_users is a separate identity space
                          -- from auth.users, same convention as admin_audit_log.target_id
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_conversation_messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type     TEXT        NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_id       UUID        NOT NULL, -- auth.users.id or admin_users.id depending on sender_type
  message         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS support_conversations_user_id_idx ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS support_conversation_messages_conversation_id_idx ON public.support_conversation_messages(conversation_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversation_messages;

-- Realtime evaluates RLS policies against the WAL record for each change before deciding
-- whether to deliver it to a subscriber. With the default replica identity (primary key only)
-- the WAL record lacks the columns the policies reference, so RLS-gated postgres_changes are
-- silently dropped even though the channel subscribes fine. FULL puts every column in the WAL.
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_conversation_messages REPLICA IDENTITY FULL;

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversation_messages ENABLE ROW LEVEL SECURITY;

-- End users (salty-mobile, anon key + their own session) — scoped to their own conversations.
CREATE POLICY "support_conversations_select_own" ON public.support_conversations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "support_conversations_insert_own" ON public.support_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_conversations_update_own" ON public.support_conversations
  FOR UPDATE USING (user_id = auth.uid()); -- lets the user close their own conversation

CREATE POLICY "support_conversation_messages_select_own" ON public.support_conversation_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "support_conversation_messages_insert_own" ON public.support_conversation_messages
  FOR INSERT WITH CHECK (
    sender_type = 'user' AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

-- Admins (salty-admin). Server actions write via createServiceClient(), which bypasses RLS
-- entirely — these SELECT-only policies exist purely so the admin UI's browser-side Realtime
-- subscriptions (anon key + the admin's own Supabase Auth session; the service-role key must
-- never reach the browser) can read rows.
--
-- The admin check goes through a SECURITY DEFINER helper rather than inlining
-- `SELECT 1 FROM admin_users`: admin_users has a deny-all RESTRICTIVE policy (it holds
-- password hashes), so a direct subquery is blocked for every role except service_role.
-- Realtime evaluates RLS as the subscriber's role (not service_role), so an inline subquery
-- silently denies all admin postgres_changes. The helper bypasses admin_users' RLS and
-- returns only a boolean.
--
-- It matches on auth.uid() (the `sub` claim) joined through auth.users rather than the `email`
-- claim: Realtime's walrus RLS context reliably provides `sub` but not necessarily `email`, so
-- an email-based check evaluates false for realtime subscribers even when it passes elsewhere.
--
-- EXECUTE is granted to PUBLIC because Realtime's walrus RLS engine evaluates policies under an
-- internal role — it's safe: the function takes no arguments and only reveals whether the
-- *caller's own* JWT belongs to an active admin.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    JOIN auth.users u ON lower(u.email) = lower(a.email)
    WHERE u.id = auth.uid() AND a.is_active = true
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO public;

CREATE POLICY "support_conversations_select_admin" ON public.support_conversations
  FOR SELECT USING (public.is_active_admin());
CREATE POLICY "support_conversation_messages_select_admin" ON public.support_conversation_messages
  FOR SELECT USING (public.is_active_admin());

-- Fold existing support_messages rows into the new thread model: each becomes a closed
-- conversation (nobody ever replied to them) with one user message. support_messages itself
-- is left in place — drop it later once the new flow is confirmed working end to end.
INSERT INTO public.support_conversations (user_id, status, closed_by, closed_at, created_at, last_message_at)
SELECT sm.user_id, 'closed', 'user', sm.created_at, sm.created_at, sm.created_at
FROM public.support_messages sm
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_conversations c WHERE c.user_id = sm.user_id AND c.created_at = sm.created_at
);

INSERT INTO public.support_conversation_messages (conversation_id, sender_type, sender_id, message, created_at)
SELECT c.id, 'user', sm.user_id, sm.message, sm.created_at
FROM public.support_messages sm
JOIN public.support_conversations c
  ON c.user_id = sm.user_id AND c.created_at = sm.created_at AND c.closed_by = 'user'
WHERE NOT EXISTS (
  SELECT 1 FROM public.support_conversation_messages m WHERE m.conversation_id = c.id
);
