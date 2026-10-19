# Loans and loan reminders

This guide documents the borrow/lend workflow, loan status transitions,
notifications, and the daily loan reminder cron.

## Intent

Loans let group members request a copy of a game from another owner without
changing catalogue ownership. The feature keeps borrower and lender views in one
place, sends status-change notifications, and reminds both parties shortly
before a due date.

Loan data is scoped to the active group through the borrowed game's `group_id`.
Only the lender and borrower can read or update a loan row.

## Primary codepaths

- `src/app/library/[id]/page.tsx`
- `src/components/BorrowButton.tsx`
- `src/app/loans/page.tsx`
- `src/components/LoanCard.tsx`
- `src/app/api/loans/route.ts`
- `src/app/api/loans/[id]/route.ts`
- `src/app/api/cron/loan-reminders/route.ts`
- `src/components/RealtimeRefresh.tsx`
- `src/lib/realtime-scope.ts`
- `src/lib/push.ts`
- `src/lib/email.ts`

## Data model

| Table / column | Purpose |
|----------------|---------|
| `loans.game_id` | Borrowed game; deleting the game cascades to its loans. |
| `loans.lender_id` | Owner who can approve or decline a pending request. |
| `loans.borrower_id` | Requesting user. A database check prevents borrowing from yourself. |
| `loans.status` | `pending`, `active`, `returned`, `declined`, or `cancelled`. |
| `loans.due_date` | Optional date used by the reminder cron. |
| `loans.notes` | Optional borrower-entered request notes. |
| `loans.borrowed_at` | Set when a lender approves the request. |
| `loans.returned_at` | Set when either party marks an active loan returned. |
| `loans.reminder_sent_at` | Set after the daily cron processes the loan once. |

Schema support lives in:

- `supabase/migrations/002_extensions.sql`
- `supabase/migrations/004_tier1_features.sql`

Fresh installs through `supabase/install.sql` include both.

## Borrow workflow

1. A signed-in group member opens a game detail page at `/library/[id]`.
2. The page loads current owners and checks whether the viewer already has a
   pending or active loan for that game from each owner.
3. `BorrowButton` hides the action for the viewer's own ownership row. For other
   owners, it opens a request form with optional due date and notes.
4. The form posts `game_id`, `lender_id`, optional `due_date`, and optional
   `notes` to `POST /api/loans`.
5. The route verifies:
   - the user is signed in
   - an active group is selected
   - the borrower is not the lender
   - the game belongs to the active group
   - the lender owns that game
6. The route inserts a `pending` loan with the current user as `borrower_id`.
7. `notifyUsersWithEmail` sends the lender a push notification and, when email
   is configured and enabled for that profile, an email linking to `/loans`.

The route trusts the active-group helper instead of accepting a group id in the
request body. Keep this pattern when adding loan endpoints so callers cannot
move a loan across groups by changing submitted JSON.

## Status transitions

Loan status changes go through `PATCH /api/loans/[id]` with a JSON body:

```json
{ "status": "active" }
```

The route first loads the loan and rejects anyone who is neither borrower nor
lender. It then updates the submitted status and applies timestamps for these
transitions:

| Transition | Who can trigger it in the UI | Side effects |
|------------|------------------------------|--------------|
| `pending` -> `active` | Lender | Sets `borrowed_at`; notifies borrower that the request was approved. |
| `pending` -> `declined` | Lender | Notifies borrower that the request was declined. |
| `pending` -> `cancelled` | Borrower | No notification. The loan is hidden from `/loans`. |
| `active` -> `returned` | Borrower or lender | Sets `returned_at`; notifies the other party. |

`/loans` shows only loans involving the current user and excludes rows with
`returned`, `cancelled`, or `declined` status. It splits visible rows into
**Borrowed** and **Lent out** sections. Realtime subscriptions refresh `/loans`
when a `loans` row changes, so the borrower and lender should see updates
without a manual reload.

## Reminder cron

`GET /api/cron/loan-reminders` sends due-date reminders for active loans that:

- have `status = 'active'`
- have `due_date` from today through tomorrow, using the server's date
- have `reminder_sent_at is null`

The route requires:

- `Authorization: Bearer <CRON_SECRET>`
- `SUPABASE_SERVICE_ROLE_KEY`
- push keys for web push delivery, when push is enabled
- `RESEND_API_KEY` and `EMAIL_FROM` for email delivery, when email is enabled
- `NEXT_PUBLIC_APP_URL` for absolute email links

For each matching loan, the cron:

1. Loads the game title plus borrower and lender names.
2. Sends web push to both borrower and lender with a link to `/loans`.
3. Sends email to both users when email is configured and their profiles have
   `email_notifications` enabled.
4. Sets `loans.reminder_sent_at` so the same loan is not processed again.
5. Returns `{ "reminded": <count> }`, where the count is loan rows processed,
   not individual notification deliveries.

The implementation currently queries today-through-tomorrow due dates, so old
overdue loans whose due date is before today are not retried by the cron. Clear
`reminder_sent_at` only when you intentionally want a loan to become eligible
again.

## Deployment notes

Vercel schedules the loan reminder endpoint in `vercel.json`:

| Endpoint | Schedule |
|----------|----------|
| `/api/cron/loan-reminders` | `0 9 * * *` |

Self-hosted deployments should run the endpoint with the same authenticated curl
pattern used by the game-night reminder:

```bash
source /opt/bglib/.env.local
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://bglib.example.com/api/cron/loan-reminders"
```

Use the public HTTPS origin configured in `NEXT_PUBLIC_APP_URL`; email links use
that value to point users back to `/loans`.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Borrow button does not appear | The viewer may own that copy, or they may already have a pending/active loan from that owner for this game. |
| Loan request returns `400` about lender ownership | Confirm the lender has an `ownership` row for the game in the active group. |
| Loan request returns `404` | Confirm the game belongs to the user's active group; the request does not accept a group id override. |
| User cannot see a loan on `/loans` | Only borrower and lender can read a loan; completed, cancelled, and declined loans are intentionally hidden. |
| Status change returns `403` | The signed-in user must be the borrower or lender on that loan. |
| Cron returns `401` | `CRON_SECRET` is set and the request header is exactly `Authorization: Bearer <value>`. |
| Cron returns `500` about service role | Set `SUPABASE_SERVICE_ROLE_KEY`; the route uses the admin client to send notifications and update `reminder_sent_at`. |
| Reminder did not send | Confirm the loan is active, has a due date between today and tomorrow on the server, and `reminder_sent_at` is null. |
| Email reminder not received | Confirm `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, and the user's `profiles.email_notifications` value. |
