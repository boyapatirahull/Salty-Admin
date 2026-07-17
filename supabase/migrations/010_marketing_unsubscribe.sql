-- Marketing-email opt-out flag on public.users. Set true when a recipient
-- clicks the unsubscribe link in a broadcast email — that link resolves to
-- /unsubscribe/[userId]?t=... where t is an HMAC of the user id so links
-- can't be guessed or transferred. Only the server-side unsubscribe action
-- can flip this.

alter table public.users
  add column if not exists unsubscribed_from_marketing boolean not null default false;
