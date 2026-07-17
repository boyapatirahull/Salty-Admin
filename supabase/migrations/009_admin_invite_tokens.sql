-- Magic-link admin invites. When a Super Admin invites a new admin, we store
-- only the SHA-256 hash of a one-time token — the raw token lives briefly in
-- the invite email URL. On accept, the invitee sets their bcrypt password and
-- the token is cleared. Two columns keep this 1:1 with the admin_users row.

alter table public.admin_users
  add column if not exists invite_token_hash       text,
  add column if not exists invite_token_expires_at timestamptz;

create index if not exists admin_users_invite_token_hash_idx
  on public.admin_users (invite_token_hash)
  where invite_token_hash is not null;
