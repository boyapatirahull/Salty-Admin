# Live Support Chat — Implementation Plan

Status: **planning complete, not yet implemented**. Starting with the admin side first.

## Goal

Replace the current one-shot "send a message into the void" support intake (the `support_messages` table, written from the mobile app's "Support" mode in `ask.tsx`) with a real two-way, real-time conversation between a user and a Salty admin — visible and closeable from both ends.

## Systems involved

1. **Shared Supabase project** (`lzhrntjwnmrpwebmqyha`) — schema + Realtime publication
2. **`salty-mobile`** — the user-facing chat UI (already has a "Support" mode shell in `app/ask.tsx`, currently writing to the old `support_messages` table)
3. **`salty-admin`** (this repo) — the new admin-facing inbox **← starting here**

---

## 1. Database schema

Replaces the existing `support_messages` table (created for the one-shot intake MVP) with a proper thread model.

```sql
-- 002_create_support_chat.sql

create table public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open', -- 'open' | 'closed'
  closed_by text, -- 'user' | 'admin' | null
  closed_at timestamptz,
  assigned_admin_id uuid, -- no FK on purpose — points into admin_users, a separate
                          -- identity space from auth.users, same convention as
                          -- admin_audit_log.target_id being a bare UUID
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.support_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_type text not null, -- 'user' | 'admin'
  sender_id uuid not null,   -- auth.users.id or admin_users.id depending on sender_type
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index support_conversations_user_id_idx on support_conversations(user_id);
create index support_conversations_status_idx on support_conversations(status);
create index support_conversation_messages_conversation_id_idx on support_conversation_messages(conversation_id);

alter publication supabase_realtime add table public.support_conversation_messages;
alter publication supabase_realtime add table public.support_conversations;

-- RLS (mobile-app side only — this admin panel bypasses RLS entirely via the
-- service-role key, same as every other table it touches)
alter table public.support_conversations enable row level security;
alter table public.support_conversation_messages enable row level security;

create policy "support_conversations_select_own" on public.support_conversations
  for select using (user_id = auth.uid());
create policy "support_conversations_insert_own" on public.support_conversations
  for insert with check (user_id = auth.uid());
create policy "support_conversations_update_own" on public.support_conversations
  for update using (user_id = auth.uid()); -- lets the user close their own conversation

create policy "support_conversation_messages_select_own" on public.support_conversation_messages
  for select using (
    exists (select 1 from support_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "support_conversation_messages_insert_own" on public.support_conversation_messages
  for insert with check (
    sender_type = 'user' and sender_id = auth.uid()
    and exists (select 1 from support_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
```

**Migration of old data**: before dropping `support_messages`, fold each existing row into one `support_conversations` (status `'closed'`, since nobody ever replied to them) + one `support_conversation_messages` row (`sender_type='user'`). Likely near-zero rows right now since the table is brand new — check first with `select count(*) from support_messages`.

**Close semantics** (the "end chat from both ends" requirement): closing is a clean terminal state, not something a stray message reopens. Once `status='closed'`, sending another message starts a **new** `support_conversations` row rather than reviving the old one. This matches standard support-ticket behavior (Zendesk/Intercom) and is simpler than auto-reopening.

---

## 2. Admin site (`salty-admin`) — build this first

Everything below follows conventions already confirmed in this codebase (`createServiceClient()`, `requireAdmin()`, `logAudit()`, the `lib/validate.ts` assert helpers, the `NAV_SECTIONS` array, and the existing `sendToUserAction` → `send-notification` edge function call).

### New page: `app/(admin)/support-chat/page.tsx`
- `await requireAdmin(3)` — same level as Feedback/Moderation/Notifications.
- Two tabs, **Open** / **Closed**, mirroring the Feedback page's `unread`/`read`/`actioned` tab pattern exactly.
- List query via `createServiceClient()`: conversations joined to the user's email/display name, sorted by `last_message_at desc`. Show the last message preview + unread indicator (any message with `read_at is null` and `sender_type='user'`).
- Selecting a conversation opens a thread view (could be a side panel or a `/support-chat/[id]` route — your call, consistent with how `/users/[id]` already works as a detail route).

### `app/(admin)/support-chat/actions.ts`
- `sendReplyAction(conversationId, message)`:
  1. `const admin = await requireAdmin(3)`
  2. Validate with `assertUUID(conversationId)`, `assertString(message, { maxLength: ... })`
  3. Insert into `support_conversation_messages`: `{ conversation_id, sender_type: 'admin', sender_id: admin.id, message }`
  4. Update the conversation's `last_message_at`
  5. `await logAudit(admin.id, 'support_reply_sent', 'support_conversation', conversationId)`
  6. Reuse `sendToUserAction`'s exact `fetch` pattern to call `/functions/v1/send-notification` for the conversation's `user_id`, so they get pushed if they're not in the app
- `closeConversationAction(conversationId)`:
  1. `requireAdmin(3)`
  2. Update `status='closed', closed_by='admin', closed_at=now()`
  3. `logAudit(admin.id, 'support_conversation_closed', 'support_conversation', conversationId)`
  4. Skip a push notification for this one — closing is low-urgency compared to a reply (flagged in case you disagree)

### Realtime — new capability for this codebase
Nothing in `salty-admin` uses `.channel()`/`postgres_changes` yet (confirmed — Notifications is fire-and-forget via Edge Function, not Realtime). The inbox list and the open thread view both need a `"use client"` component subscribed to:
- `support_conversation_messages` inserts (new user messages appearing live)
- `support_conversations` updates (so a user closing their side reflects live without a refresh)

### Nav
Add to `components/sidebar.tsx`'s `Management` section:
```ts
{ href: '/support-chat', label: 'Support Chat', icon: MessageSquare, maxLevel: 3 }
```
Optional unread-count badge via `getLayoutCounts()` in `app/(admin)/layout.tsx` — count of open conversations with an unread user message.

---

## 3. Mobile app (`salty-mobile`) — second phase

- `sendAgent()` in `app/ask.tsx`: find-or-create an **open** conversation for the user (create one if none exists or the last one is closed), insert into `support_conversation_messages` instead of the old `support_messages`.
- Subscribe to Realtime on the active `conversation_id` for both new messages and conversation-status updates, so an admin's reply (and an admin-side close) appear instantly.
- "End chat" action in the Support mode header → confirm dialog (`Alert.alert`, matching the existing unfollow-confirmation pattern in this app) → `status='closed', closed_by='user', closed_at=now()`.
- When the active conversation is closed (either side), replace the input bar with a "Conversation closed — Start a new one" banner/button that creates a fresh conversation.
- Drop the canned "Thanks — that's been sent" acknowledgment text now that real replies can arrive.

---

## Rollout order

1. Migration (schema + Realtime publication + RLS + fold/drop old `support_messages`)
2. **Admin site** (this is the starting point): page, actions, Realtime subscription, nav entry, audit logging, notification reuse
3. Mobile app: conversation-aware Support mode + Realtime subscribe + end-chat action
4. End-to-end test: send from app → appears in admin instantly → admin replies → appears in app instantly + push if backgrounded → either side closes → other side sees it live
5. Drop old `support_messages` table once confirmed clean

## Open decisions

- Push notification on admin-side close: currently planned as **no** (see above) — say so if you want it.
- Thread view as a side panel vs. a `/support-chat/[id]` route — left as an admin-site implementation choice, no strong reason to prefer one given the rest of this plan.
- Closed conversation history isn't browsable as a list from the mobile side in this plan (only the single most recent conversation is shown) — call it out if you want a full history view later.
