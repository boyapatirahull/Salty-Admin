-- Add banned_until to public.users for non-destructive account suspension
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ NULL;
