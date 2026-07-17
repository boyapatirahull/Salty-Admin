-- Skip app-user profiles for auth users minted by admin-panel invites.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
BEGIN
  IF new.email_confirmed_at IS NULL THEN
    RETURN new;
  END IF;

  -- Accounts minted by the admin-panel invite flow are staff logins, not app
  -- users. They still need an auth.users row for sessions and RLS (auth.uid()),
  -- but must not appear in the app's user base. Only inviteAdminAction sets this
  -- flag, so real signups — including admins who are also genuine app users —
  -- are unaffected.
  IF new.raw_user_meta_data->>'created_via' = 'admin_invite' THEN
    RETURN new;
  END IF;

  v_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  IF v_username IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users WHERE username = v_username
  ) THEN
    v_username := NULL;
  END IF;

  INSERT INTO public.users (id, email, display_name, username, zip_code)
  VALUES (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    v_username,
    nullif(trim(new.raw_user_meta_data->>'zip_code'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$function$
