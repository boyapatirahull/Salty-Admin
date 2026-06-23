# Salty Admin

Internal admin panel for **Salty**, the ticket-tracking mobile app. Built as a standalone Next.js site against the same Supabase project as the mobile app (`lzhrntjwnmrpwebmqyha`), with its own admin identity system completely decoupled from app users.

It exists because the mobile app has no way for the team to see what's happening across *all* users at once — review Gmail/photo-scan imports, moderate content, manage tiers and bans, send notifications, or audit what other team members have done. Everything here uses the Supabase **service role key** server-side to read/write across every user's data; nothing here relies on the mobile app's per-user RLS policies.

---

## Tech stack

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth + Storage + Edge Functions) · shadcn/ui · Tailwind v3 · Recharts · bcryptjs

Design system: Sora (headings/numbers) + DM Sans (body), ember/gold/cream palette.

---

## Access levels

Every page and every server action independently re-checks the caller's access level server-side — the UI hiding a button is never the only guard.

| Level | Name | Can do |
|---|---|---|
| **1** | Super Admin | Everything below, plus manage admin accounts, view audit log, invite/deactivate/delete other admins |
| **2** | Admin | Delete users, ban/unban, change tiers, approve/reject imports (incl. bulk), revoke email connections, force sign-out, send password resets |
| **3** | Moderator | View/moderate content (photos, notes, tags), feedback, tickets, notifications, active users |
| **4** | Support | Read-only — dashboard and user list only |

---

## Pages

### Dashboard (`/`)
KPIs (total users, tickets stored, email accounts connected, users active today, pending review), a 6-month ticket activity chart, a live activity feed that merges new signups, feedback, and recent admin actions, a recent-users table, a pending-imports preview, a ticket-category breakdown, and platform health (email adoption, import approval rate, banned users).

### Analytics (`/analytics`, Super Admin only)
Deeper trends: DAU/WAU/MAU (from real `last_sign_in_at` data), 6-month ticket activity, category distribution, 30-day signup chart, tickets-by-source, top venues, user tier breakdown, content moderation volume, and admin activity stats (total audit events, events in the last 7 days, most active admin).

### Users (`/users`)
Searchable, paginated table of every app user — email, username, tier, zip code, ticket count, connected email providers (Gmail/IMAP), join date, and ban status. Filterable by tier and zip. Level 1 can export the filtered list as CSV (audited).

### User detail (`/users/[id]`)
Full profile: tickets, friends, pending imports, submitted feedback, Gmail connection status, last sign-in. Actions (gated by level): change tier, ban/unban, send a push notification, send a password reset email, force sign-out everywhere, delete the account entirely (cleans up every related table — tickets, friendships, notifications, gmail/imap connections, ticket attendee tags, etc. — and removes the matching `admin_users` row too if that email is also an admin, since deleting the underlying Supabase Auth account would otherwise leave a broken admin entry behind).

### Active Users (`/users/active`)
Who's actually using the app right now, windowed by Online now / Last 24h / Last 7 days / Last 30 days, based on real Supabase Auth sign-in timestamps.

### Tickets (`/tickets`)
Cross-user ticket table — search by title/venue/email, filter by category/source/status, inline-edit bad parses, delete with confirmation. Level 1 can export the filtered list as CSV (audited).

### Pending Imports (`/pending-imports`)
The review queue every non-manual ticket (Gmail, calendar, wallet, photo-scan) passes through before becoming a real ticket. Tabs for pending/approved/rejected, confidence score, image preview where available, single and **bulk** approve/reject.

### Email Connections (`/gmail-connections`)
Unified view of every Gmail *and* IMAP (Outlook/Yahoo/iCloud/AOL) connection across all users — provider, connected/last-synced dates, staleness warning past 14 days, and a revoke action. Deliberately never selects `access_token`, `refresh_token`, `password`, or `imap_host`/`imap_port` — those stay out of every admin view, full stop.

### Moderation (`/moderation`)
Tabs for user-uploaded ticket photos (grid view, delete removes both the Storage object and the DB row), ticket notes, and ticket tags.

### Feedback (`/feedback`)
Inbox for in-app feedback submissions — filter by status (unread/read/actioned), aggregate stats (average rating, top category).

### Notifications (`/notifications`)
Send a push notification to a single user, or broadcast to all users (optionally filtered by ticket category) — rate-limited to one broadcast per 5 minutes. Shows the last 50 sent notifications.

### Admin Users (`/settings/admin-users`, Super Admin only)
Invite new admins (auto-creates their Supabase Auth account and emails a password-setup link), change access levels, deactivate/reactivate (deactivating also kills their live session immediately), and delete admin accounts entirely. Deletion is blocked if the admin has audit log history — that history must be either preserved (use Deactivate) or explicitly purged via a second, clearly-labeled confirmation step naming exactly how many entries would be erased.

### Audit Log (`/settings/audit-log`, Super Admin only)
Full paginated record of every admin action — who, what, on what target, with metadata — filterable by action type.

### My Profile (`/profile`)
Self-service: update display name, change your own password (requires entering your current password first).

---

## Security notes

- **Login**: custom bcrypt-hashed admin passwords (separate from the mobile app's auth), with a 5-attempts → 15-minute lockout per account, and login history (IP + user agent) recorded on every successful sign-in.
- **Every server action revalidates the caller's access level itself** — never trusts that a button was hidden client-side.
- **Plaintext credentials never surface anywhere**: Gmail OAuth tokens and IMAP passwords are excluded from every query that touches those tables.
- **PII masking**: emails are masked (`a***@domain.com`) for anyone below Admin level wherever they'd otherwise be visible.
- **Search inputs are sanitized** before being interpolated into Supabase `.or()` filters, to prevent filter-clause injection.
- **Bulk CSV exports are audited** — who exported what filters, and how many rows.
- **Destructive actions verify the target exists and check foreign-key fallout first** (e.g. deleting a user also cleans up `ticket_attendees`, IMAP/Gmail connections, saved events, followed artists, etc. rather than leaving orphaned rows or silently failing on a constraint violation).
