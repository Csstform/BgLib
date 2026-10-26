# Loans and reminders

This guide documents the loan request workflow, loan status transitions, and the
daily due-date reminder cron.

## Intent

Loans let group members request a physical copy from another owner without
moving ownership in the catalogue. The feature tracks two separate concepts:

- who owns the catalogue copy (`ownership`)
- who is currently borrowing it (`loans`)

The loan lifecycle is intentionally lightweight: users request, approve, cancel,
decline, and mark returned from the app UI. Reminder delivery is a best-effort
operational task that runs once per active loan due today or tomorrow.

## Primary codepaths

- `src/app/library/[id]/page.tsx`
- `src/components/OwnerRow.tsx`
- `src/components/BorrowButton.tsx`
- `src/app/loans/page.tsx`
- `src/components/LoanCard.tsx`
- `src/app/api/loans/route.ts`
- `src/app/api/loans/[id]/route.ts`
- `src/app/api/cron/loan-reminders/route.ts`
- `src/lib/push.ts`
- `src/lib/email.ts`

## Data model

| Table / column | Purpose |
|----------------|---------|
| `loans.game_id` | Catalogue game being borrowed. Deleting the game cascades the loan away. |
| `loans.lender_id` | Profile that owns the copy and receives the initial request. |
| `loans.borrower_id` | Signed-in profile requesting the copy. |
| `loans.status` | One of `pending`, `active`, `returned`, `declined`, or `cancelled`. |
| `loans.due_date` | Optional date used by the reminder cron. |
| `loans.notes` | Optional borrower-supplied request notes. |
| `loans.borrowed_at` | Set when a loan is approved and becomes `active`. |
| `loans.returned_at` | Set when either involved party marks the loan `returned`. |
| `loans.reminder_sent_at` | Set by the cron after a due-date reminder is processed. |

Schema support lives in:

- `supabase/migrations/002_extensions.sql` for the base `loans` table, indexes,
  update trigger, and RLS policies
- `supabase/migrations/004_tier1_features.sql` for
  `loans.reminder_sent_at` and profile email preferences

Fresh installs through `supabase/install.sql` include both migrations.

RLS keeps loan rows visible to the lender and borrower only. It also limits
inserts to the authenticated borrower creating a `pending` request and allows
involved parties to update rows. Route handlers add application-level checks for
active group, game membership, and ownership before creating requests.

## Request workflow

1. A signed-in member opens a game detail page at `/library/[id]`.
2. The page loads owners for the active-group game and checks whether the
   current user already has a `pending` or `active` loan with each owner.
3. `OwnerRow` renders `BorrowButton` for owners other than the current user. If
   an active request already exists for that owner, the row shows
   **Loan pending** instead.
4. The borrower can add an optional due date and notes. `BorrowButton` posts:

   ```json
   {
     "game_id": "<game uuid>",
     "lender_id": "<owner profile uuid>",
     "due_date": "2026-11-07",
     "notes": "Can I bring this to Saturday?"
   }
   ```

5. `POST /api/loans` requires a signed-in user with an active group, rejects
   self-borrowing, verifies the game belongs to the active group, and verifies
   the lender has an `ownership` row for the game.
6. The route inserts a `pending` loan with the signed-in user as
   `borrower_id`, then notifies the lender with a link to `/loans`.

The route relies on the active group rather than a group id in the request body.
If a user switches groups, requests are scoped to the currently active group.

## Managing loans

The `/loans` page shows active work only:

- loans involving the current user as lender or borrower
- loans for games in the active group
- rows whose status is not `returned`, `cancelled`, or `declined`

The page separates **Borrowed** and **Lent out** sections, then delegates each
row to `LoanCard`.

`PATCH /api/loans/[id]` requires the signed-in user to be the lender or
borrower. The UI exposes these transitions:

| Current status | User | UI action | New status | Side effects |
|----------------|------|-----------|------------|--------------|
| `pending` | Lender | Approve | `active` | Sets `borrowed_at`; notifies borrower. |
| `pending` | Lender | Decline | `declined` | Notifies borrower. |
| `pending` | Borrower | Cancel request | `cancelled` | No notification. |
| `active` | Lender or borrower | Mark returned | `returned` | Sets `returned_at`; notifies the other party. |

The route accepts a status value from the client and writes it after confirming
the caller is involved in the loan. Keep new clients aligned with the status
transitions above so borrowed/returned timestamps and notifications stay
predictable.

## Reminder cron

`GET /api/cron/loan-reminders` sends due-date reminders for active loans where:

- `status = active`
- `due_date` is today or tomorrow by the server's UTC date calculation
- `reminder_sent_at` is still `null`

The route requires:

- `Authorization: Bearer <CRON_SECRET>`
- `SUPABASE_SERVICE_ROLE_KEY` for server-side reads and updates
- VAPID keys for web push delivery, when push is enabled
- `RESEND_API_KEY` and `EMAIL_FROM` for email delivery, when email is enabled
- `NEXT_PUBLIC_APP_URL` for absolute email links

For each matching loan, the cron:

1. Sends push and email to both borrower and lender.
2. Uses a due-date reminder message that includes the stored due date. The
   current query excludes dates before the current server date.
3. Links notifications to `/loans`.
4. Sets `loans.reminder_sent_at` so the same loan is not reminded again.
5. Returns `{ "reminded": <count> }`, where the count is loans processed, not
   users or individual delivery attempts.

Vercel runs the endpoint daily at 09:00 UTC through `vercel.json`. Self-hosted
deployments can use `deploy/bglib-cron.service` and
`deploy/bglib-cron.timer`, which call the same endpoint with the bearer token.

## Operational checklist

When deploying or debugging loans:

1. Confirm users can see owned copies on `/library/[id]`; requests require an
   `ownership` row for the selected lender.
2. Confirm the borrower and lender are operating in the same active group. The
   create route rejects games outside the borrower's active group.
3. Set `SUPABASE_SERVICE_ROLE_KEY` before relying on reminder cron delivery.
4. Set `CRON_SECRET` and pass it as the `Authorization` bearer token when
   calling `/api/cron/loan-reminders`.
5. Set push and/or email env vars if reminders should deliver outside the app.
6. Check `/loans` after a status change; returned, declined, and cancelled rows
   intentionally leave the active list.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Borrow button is missing | The viewer may own the copy, be signed out, or the owner row is missing `gameId`/`currentUserId`. |
| Borrow button says Loan pending | The borrower already has a `pending` or `active` loan for that game from that owner. |
| Request returns "Game not in your group" | The borrower's active group does not match the game's `group_id`. |
| Request returns "Lender does not own this game" | The selected lender needs an `ownership` row for the game. |
| Loan does not appear on `/loans` | Only active-group loans involving the current user are shown, and terminal statuses are filtered out. |
| Cron returns 401 | `CRON_SECRET` is missing or does not match the bearer token. |
| Cron returns service-role error | Set `SUPABASE_SERVICE_ROLE_KEY` in the runtime environment. |
| Cron returns `{ "reminded": 0 }` | Confirm the loan is `active`, has a due date today or tomorrow, and `reminder_sent_at` is `null`. |
