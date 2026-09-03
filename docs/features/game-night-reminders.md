# Game nights and reminders

This guide documents the game-night planning workflow, local-time display,
calendar sync, immediate notifications, and the daily reminder cron.

## Intent

Game nights help a group coordinate a session around a time, place, attendees,
and candidate games. Notifications are split into:

- immediate notices when a host creates, updates, or cancels a game night
- daily reminders for game nights scheduled tomorrow

Both notification paths reuse the app's push and email helpers.

## Primary codepaths

- `src/app/game-nights/page.tsx`
- `src/components/GameNightForm.tsx`
- `src/app/game-nights/new/page.tsx`
- `src/app/game-nights/[id]/page.tsx`
- `src/app/game-nights/[id]/edit/page.tsx`
- `src/app/game-nights/[id]/RsvpButtons.tsx`
- `src/components/GameNightsCalendarExport.tsx`
- `src/components/GameNightCalendarActions.tsx`
- `src/components/GameNightPicker.tsx`
- `src/components/LocalDateTime.tsx`
- `src/app/api/game-nights/route.ts`
- `src/app/api/game-nights/[id]/route.ts`
- `src/app/api/game-nights/[id]/games/route.ts`
- `src/app/api/game-nights/calendar/route.ts`
- `src/app/api/game-nights/calendar/[token]/route.ts`
- `src/app/api/game-nights/[id]/calendar/route.ts`
- `src/lib/calendar-feed.ts`
- `src/lib/calendar-feed-url.ts`
- `src/lib/calendar-feed-response.ts`
- `src/lib/load-game-night-calendar.ts`
- `src/lib/game-night-calendar.ts`
- `src/lib/ics.ts`
- `src/app/api/cron/game-night-reminders/route.ts`
- `src/lib/push.ts`
- `src/lib/email.ts`
- `src/lib/game-night-email.ts`
- `src/lib/send-game-night-invite.ts`

## Data model

| Table / column | Purpose |
|----------------|---------|
| `game_nights` | Event title, description, scheduled time, location, host, group, cancellation timestamp, and reminder timestamp. |
| `game_nights.reminder_sent_at` | Set by the reminder cron after tomorrow's reminder is sent. |
| `game_night_rsvps` | One RSVP per user per game night. Status values used by the UI are `going`, `maybe`, and `declined`. |
| `game_night_games` | Candidate or planned games attached to the event. |

Schema support lives in:

- `supabase/migrations/002_extensions.sql`
- `supabase/migrations/012_game_night_reminders.sql`

Fresh installs through `supabase/install.sql` include both.

## Planning workflow

1. A signed-in group member opens `/game-nights/new`.
2. The form posts `title`, `scheduled_at`, optional `description`, optional
   `location`, optional `game_ids`, and `send_email` to `POST /api/game-nights`.
3. The route creates the `game_nights` row in the active group, inserts selected
   `game_night_games`, and upserts the host's RSVP as `going`.
4. `notifyGroupMembers` sends a push notification ("New game night planned!") to
   other members. If the host leaves **Email the group** checked (the default
   when Resend is configured), those members also receive an invite email with
   the time, place, planned games, an RSVP link, and an `.ics` attachment.
5. The user lands on `/game-nights/[id]`, where members can RSVP and the
   `GameNightPicker` can suggest games based on people marked `going`.
6. The host can open `/game-nights/[id]/edit` to change title, time, location,
   description, or planned games. The form puts those fields to
   `PUT /api/game-nights/[id]`. Push always goes out; the same email-invite
   checkbox controls whether an updated invite is emailed.

Only the host can update, cancel, or replace the planned games for a game night.
The API checks `night.host_id === user.id` before those mutations. Cancelled
nights cannot be edited.

## Timezone handling

Game-night times are stored as ISO timestamps in `game_nights.scheduled_at`.
Create and edit forms render `datetime-local` values in the browser so hosts
enter the time in their own local timezone, then submit an ISO value to the API.

List cards, detail pages, and dashboard cards render through `LocalDateTime` or
the shared date utilities so each viewer sees the scheduled time in their own
local timezone. Calendar exports keep the ISO timestamp and let the calendar
client interpret it. Do not pre-format game-night times on the server for
user-facing UI; server rendering does not know the viewer's timezone.

## Calendar sync and ICS feeds

The `/game-nights` list page renders a calendar-sync card for signed-in members
with an active group. The page creates a per-user, per-group feed token with
`createCalendarFeedToken(user.id, groupId)` and passes it to the client
component that builds:

- **Add to Google Calendar**: a subscription URL at
  `https://calendar.google.com/calendar/r?cid=<webcal feed>`.
- **Apple Calendar**: the same feed URL rewritten from `https://` to `webcal://`.
- **Copy feed URL**: an HTTPS `.ics` URL for calendar apps that subscribe
  "From URL".
- **Download N upcoming**: a session-authenticated one-time download from
  `/api/game-nights/calendar`.

Subscribed feeds are served by:

| Route | Auth model | Purpose |
|-------|------------|---------|
| `GET/HEAD /api/game-nights/calendar/[token].ics` | Signed feed token | Calendar-app subscription without a browser session. |
| `GET/HEAD /api/game-nights/calendar?token=...` | Signed feed token | Alternate token entry point for clients that cannot keep the path form. |
| `GET/HEAD /api/game-nights/calendar` | Supabase session | Download the active group's upcoming game nights once. |
| `GET /api/game-nights/[id]/calendar` | Supabase session + group membership | Download one event from the detail page. |

Feed tokens encode `userId:groupId:signature` as base64url. The signature is an
HMAC-SHA256 over `userId:groupId`; the secret is resolved in this order:
`CALENDAR_FEED_SECRET`, then `SUPABASE_SERVICE_ROLE_KEY`, then the local-dev
fallback `bglib-local-dev-calendar-feed`. Production deployments should set
`CALENDAR_FEED_SECRET` so calendar subscriptions do not depend on rotating the
Supabase service-role key. Changing the feed secret invalidates existing
subscription URLs, so users need to re-add the calendar after a rotation.

Token feeds use the admin Supabase client because external calendar apps do not
send the user's Supabase cookies. Before returning events,
`canAccessGroupCalendar` checks that the token's user is still a row in
`group_members` for that group; removed members receive `403`. Production
deployments should provide `SUPABASE_SERVICE_ROLE_KEY` so these unauthenticated
feed requests can pass the membership check and read upcoming events.

Feed content is intentionally narrow:

- only the token's group
- only upcoming events (`scheduled_at >= now`)
- no cancelled events
- title, description, location, host name, planned game titles, and an event URL
- a default three-hour end time when building each ICS event
- `REFRESH-INTERVAL` and `X-PUBLISHED-TTL` hints of one hour

Google Calendar may still take several hours to refresh after the first
subscription. The detail page's Google Calendar action is different: it creates
a one-off `action=TEMPLATE` URL for that event, not a subscription. Invite emails
also attach a single-event `.ics` file.

## Reminder cron

`GET /api/cron/game-night-reminders` sends reminders for uncancelled game nights
scheduled for the next local-day window computed by the server:

```text
now + 1 day, 00:00:00.000 through 23:59:59.999
```

The route requires:

- `Authorization: Bearer <CRON_SECRET>`
- `SUPABASE_SERVICE_ROLE_KEY`
- push keys for web push delivery, when push is enabled
- `RESEND_API_KEY` and `EMAIL_FROM` for email delivery, when email is enabled
- `NEXT_PUBLIC_APP_URL` for absolute email links

For each matching game night, the cron:

1. Loads all group members.
2. Excludes members whose RSVP status is `declined`.
3. Sends web push and email with a link to `/game-nights/[id]`.
4. Sets `game_nights.reminder_sent_at` so the same event is not reminded again.
5. Returns `{ "reminded": <count> }`, where the count is game nights processed,
   not individual users or notification deliveries.

Members with no RSVP and members marked `maybe` are included in tomorrow's
reminder. Declined members are excluded.

## Deployment notes

Vercel schedules both reminder endpoints in `vercel.json`:

| Endpoint | Schedule |
|----------|----------|
| `/api/cron/loan-reminders` | `0 9 * * *` |
| `/api/cron/game-night-reminders` | `0 10 * * *` |

Self-hosted deployments should run both endpoints with the same
`Authorization: Bearer $CRON_SECRET` header. The existing deployment runbook
shows the systemd timer pattern.

Manual smoke test:

```bash
source /opt/bglib/.env.local
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://bglib.example.com/api/cron/game-night-reminders"
```

Use the same public origin configured in `NEXT_PUBLIC_APP_URL`.

Calendar sync uses the same public origin for subscription URLs. Set
`CALENDAR_FEED_SECRET` in production if you want feed tokens to remain stable
across Supabase service-role key rotations.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Cron returns `401` | `CRON_SECRET` is set and the request header is exactly `Authorization: Bearer <value>`. |
| Cron returns `500` about service role | Set `SUPABASE_SERVICE_ROLE_KEY`; the route uses the admin client to read members and send notifications. |
| Reminder does not send for an event tomorrow | Confirm the event is not cancelled, `reminder_sent_at` is null, and the server's tomorrow window includes `scheduled_at`. |
| Declined user still received a create/update notification | Expected: immediate host notifications go to group members except the host. Only the daily reminder excludes declined RSVPs. |
| Email link points at the wrong host | Set `NEXT_PUBLIC_APP_URL` to the public HTTPS app URL without a trailing slash. |
| Create form has no working email checkbox | Set `RESEND_API_KEY` and `EMAIL_FROM`. The checkbox is visible but disabled until both are set. |
| Invite email not received | Confirm `SUPABASE_SERVICE_ROLE_KEY` (used to look up member emails), `profiles.email_notifications` is not off, and Resend accepted the send. |
| Calendar feed URL points at localhost or the wrong host | Set `NEXT_PUBLIC_APP_URL` to the public HTTPS app URL before building or serving the app. |
| Calendar subscription returns `401` | The token is malformed or signed with an old `CALENDAR_FEED_SECRET` / service-role key; copy a fresh feed URL from `/game-nights`. |
| Calendar subscription returns `403` | The token's user is no longer a member of the group in `group_members`. |
| Calendar app does not show a recent change | Confirm the event is upcoming and not cancelled. Calendar clients may cache feeds despite the one-hour refresh hints; Google can lag for several hours. |
