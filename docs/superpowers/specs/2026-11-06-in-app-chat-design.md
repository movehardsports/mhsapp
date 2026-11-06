# In-app chat between a brand and an athlete

Date: 2026-11-06. Status: design, not built.

## Intent

A brand publishes a campaign, an athlete applies with an opening message, the brand accepts
the application. Accepting opens a chat between that brand and that athlete, where they
settle the details of working together (dates, terms, what the athlete does). Everything
they agree on goes through the chat: email and phone are never shown to the other side.

This reverses two lines in `AGENTS.md`: in-app chat is no longer out of scope, and an
accepted collaboration no longer "reveals contact details". `AGENTS.md` (Product, access
rules, Status, Next) is updated in the same PR.

## Decided by the user

- One chat per accepted application. The same brand and athlete on another campaign have a
  separate chat.
- No email or phone is ever revealed; the chat replaces contact details.
- If the brand changes an accepted application to rejected, the chat is locked: nobody can
  write in it any more.
- Messages appear immediately, without reloading, like Messenger or WhatsApp.
- New messages are signalled only by an icon in the header (no email notifications).
- Layout A: a separate Messages page, like Messenger: the list of conversations on the left,
  the open conversation on the right. On phones, the list first, then the conversation full
  screen.
- No "collaboration agreed / finished" step for now: the conversation just goes on.
- Once an application has been accepted, the brand can only switch it between `accepted` and
  `rejected`, never back to `pending`. So an accepted application can never be withdrawn and
  a chat's history never disappears.
- Accepting, closing (rejecting after acceptance) and reopening (accepting again) show up in
  the chat as short system entries, and count as unread for the athlete, so the header icon
  tells the athlete something changed.

## Goals

- An accepted application has a chat the two sides (the athlete and the campaign's brand)
  can read and write in, live.
- Signed-in users see in the header whether they have unread messages, updated live.
- Only the two sides of a chat can ever read or write its messages, enforced by RLS.

## Non-goals (for now)

- Email or push notifications, typing indicators, read receipts shown to the other side,
  attachments or images, reactions, editing or deleting messages, link previews.
- Group chats, chats not tied to an application, a brand messaging an athlete who hasn't
  applied (invitations from the athlete catalogue come later and may reuse this).
- A collaboration status beyond the application's own status.
- Moderation, reporting or blocking users.

## Anti-goals (would make it a failure even if it works)

- Any other user, a guest, or another brand reading a conversation or learning it exists.
- The athlete's last name (`athlete_private`), email or phone shown to the brand, or the
  brand account's email shown to the athlete.
- Writing into a locked chat by calling the Data API directly.
- Messages leaking through Realtime to users who aren't a side of the chat.

## Behaviour

### When a chat exists and is open

- A chat belongs to one application. It is **open** while the application's status is
  `accepted`, and **locked** when it is `rejected` after having been accepted. Accepting it
  again unlocks it.
- A `pending` application that was never accepted has no chat. A chat appears in the list
  once the application has been accepted at least once, and stays there.
- The database refuses moving an application that was ever accepted back to `pending` (a
  trigger, or whatever the builder finds cleanest; an RLS `with check` can't see the old
  row). The applications page stops offering it. Since the delete policy only allows pending
  applications, this is what keeps an accepted application from being withdrawn.
  Applications that are already accepted in existing data count as "ever accepted".
- A locked chat keeps its history readable by both sides, marked "Conversation closed", with
  no message box. Writing is refused by the database too (RLS on insert checks the
  application's status), not only hidden in the UI.
- An athlete can only withdraw a pending application, so withdrawing never touches a chat.
  Campaigns with applications can't be deleted, so chats don't vanish with campaigns.

### The opening message

The application's message is shown as the first bubble of the chat, from the athlete, marked
"Message from the application". My call: it's read from `applications.message`, not copied
into the messages table, so it stays a single source of truth.

### System entries

- When the brand accepts the application, closes the chat (rejects after acceptance) or
  reopens it (accepts again), the chat shows a short centred entry with its time: "<Brand>
  accepted the application", "Conversation closed", "Conversation reopened".
- They are created by the database when the status changes, not by the app, so they can't be
  forged or skipped. Nobody can write them through the Data API.
- They count as unread for the athlete (the brand made the change, so not for the brand),
  appear live, and show as the last message in the conversation list.

### Messages page (`/messages`, `/messages/[id]`)

- Signed-in, onboarded users only; guests and users still onboarding are redirected like on
  `/dashboard` (`requireOnboardedAccount` in `src/lib/auth/session.ts`).
- Left: the user's conversations, most recent activity first. Each item: the other side's
  name, the campaign title, the last message (shortened), its time, an unread dot, a lock for
  locked chats.
- Right (`/messages/[id]`, `[id]` = the chat, see Data below): header with the other side's
  name and a link to the campaign; the messages as bubbles (own on the right), with times;
  the message box and Send at the bottom (absent when locked).
- New messages from the other side appear live; the list on the left updates live too
  (reorder, last message, unread dot).
- `/messages` with no conversation selected: on desktop the list plus an empty state ("Pick a
  conversation"); with no conversations at all, a short explanation (brands: accept an
  application; athletes: apply to campaigns, link to `/campaigns`).
- A chat id the user isn't a side of returns the 404 page (`notFound()`), the same as one
  that doesn't exist.
- Who is shown: to the brand, the athlete's public profile name (first name and nickname,
  as on the applications page; never the last name). To the athlete, the brand's name.

### Links into a chat

- Brand: on `/dashboard/campaigns/[id]/applications`, each accepted (or locked) application
  gets a "Messages" link to its chat.
- Athlete: on the dashboard's application list, each accepted (or locked) application gets
  a "Messages" link.

### Header icon

- Signed-in users see a messages icon next to the Dashboard button (desktop and the mobile
  menu), linking to `/messages`. Guests don't see it.
- It shows the number of conversations with unread messages (my call: conversations, not
  messages; hidden at 0), updated live.
- Unread: a message from the other side (or, for the athlete, a system entry) newer than the
  moment the user last opened that conversation. Opening a conversation (and receiving messages while it is open) marks it
  read.

### Sending

- Text only, trimmed, at least one visible character (`hasVisibleText` in
  `src/lib/validation.ts`, and the same check in the database as `applications.message`),
  at most 2000 characters (my call), line breaks kept. Shown as plain text: no HTML, links
  not turned into anchors.
- Sent through a Server Action like every other mutation (`AGENTS.md` conventions). The
  form must work before hydration and not put the text into the URL. After sending, the
  message box clears and keeps focus.
- Enter sends, Shift+Enter makes a new line (my call, as in Messenger).
- My call: a simple rate limit is out of scope for this PR (noted in Status as not set up,
  like the one on applying).

## Data and security (constraints; the exact schema is the builder's)

- Messages live in a new table in `public` with RLS, explicit grants and policies scoped with
  `(select auth.uid())`, through a migration. A message references the application (the chat
  is the application, so `/messages/[id]` can use the application id) and its sender; the
  sender is always the current user (`with check`).
- Read: the athlete of the application and the brand of its campaign, only.
- Insert: the same two, only while the application's status is `accepted`.
- No update or delete grants on messages.
- Read state: per user and chat, stored so that each user can only update their own row.
- Realtime: use Supabase Realtime so new messages and unread changes arrive live. It must
  respect the same access rules (for example Postgres Changes on a table with RLS, or
  Broadcast with private channels and policies on `realtime.messages`); which mechanism is
  the builder's call after checking the current Supabase docs. Realtime is enabled in
  `supabase/config.toml` locally; the hosted project needs the same setup (note it in
  Status, like the other hosted settings).
- Data access goes through a new domain module `src/lib/messages/` (`queries.ts`,
  `mutations.ts`, `validation.ts` with unit tests), per the conventions. The client-side
  Realtime subscription is the one place a client component talks to Supabase directly;
  it only listens, it never writes.
- Glossary: the glossary's `collaboration` (an accepted application) is what owns the chat.
  Whether a `collaborations` table is introduced or the chat hangs directly off
  `applications` is the builder's call; the URL and code use `messages`.

## Tests

- Unit: the message parser (`src/lib/messages/validation.ts`).
- E2E (Playwright): accept an application, both sides exchange messages and see them live
  (two browser contexts); the header icon shows and clears the unread count; rejecting
  locks the chat (no box; a direct insert through the Data API is refused); a third user
  (another brand, another athlete) and a guest can't read the chat or its messages through
  the page, the Data API or Realtime; mobile layout (list, then conversation, then back).

## Delivery

Several PRs, one per step, each with its own go-ahead and `AGENTS.md` Status update (my call,
following the small-steps rule in `AGENTS.md`). Suggested order:

1. Database: messages, read state, system entries, the "never back to pending" rule, RLS and
   their e2e checks through the Data API. `AGENTS.md` Product/access rules updated here.
2. `/messages` pages (read only) and the "Messages" links from both dashboards.
3. Sending messages.
4. Live updates (Realtime) and the header icon.

## Left to the builder

The table layout and names, the Realtime mechanism, how the live list and the icon
subscribe, the unread query, styling within the existing Tailwind look, and the pagination
of long conversations (my call: load the latest 100 messages, older ones are not needed
yet).
