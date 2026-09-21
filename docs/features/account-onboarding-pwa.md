# Account access, onboarding, and PWA install

This guide documents the first-run account flow: signing up or signing in,
joining a group invite, completing onboarding, resetting passwords, and helping
users install BgLib as a PWA.

## Intent

The account entry points should get a new member into a usable group library
before they reach the main app. The middleware protects group-scoped pages,
redirects incomplete profiles through onboarding, and keeps invite links usable
for signed-out users.

## Primary codepaths

- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/join/[code]/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingWizard.tsx`
- `src/components/OnboardingQuickAdd.tsx`
- `src/components/PwaInstallGuide.tsx`
- `src/components/PushNotificationToggle.tsx`
- `src/components/EmailNotificationToggle.tsx`
- `src/lib/group-actions.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/group-invite.ts`
- `src/lib/pwa-platform.ts`

## Route and redirect model

| Route | Auth model | Behavior |
|-------|------------|----------|
| `/signup` | Public | Creates a Supabase Auth user with `display_name` metadata, then sends users with an `invite` query string to `/join/<code>`; otherwise it goes to `/library`. |
| `/login` | Public | Signs in with email/password and honors a safe relative `redirect` query parameter. Missing or unsafe redirects fall back to `/library`. |
| `/forgot-password` | Public | Calls `resetPasswordForEmail` with `/auth/callback?next=/reset-password` on the current origin. |
| `/auth/callback` | Public | Exchanges the Supabase auth code for a session, then redirects to a safe relative `next` path or `/library`. |
| `/reset-password` | Session from callback | Updates the signed-in user's password after local length and confirmation checks. |
| `/join/[code]` | Public or signed in | Normalizes invite codes, looks up the target group, asks signed-out users to sign up or sign in, and auto-joins signed-in users. |
| `/onboarding` | Signed in | Forces incomplete profiles through group setup, quick-add, install guidance, and notification choices. |

The middleware currently requires a session for `/collection`, `/add-game`,
`/profile`, `/loans`, `/game-nights/new`, `/picker`, and `/plays`. Signed-in
users whose `profiles.onboarding_completed` is false are redirected to
`/onboarding` unless they are already on auth, join, onboarding, or API routes.
Signed-in users who open `/login` or `/signup` are redirected to `/library`.

Only relative redirects beginning with a single `/` are accepted by the login
page and auth callback. This avoids treating external URLs or protocol-relative
strings as post-auth destinations.

## Signup and invite workflow

1. A new user opens `/signup`, optionally through `/signup?invite=<code>`.
2. Supabase Auth creates the user. The database trigger creates the profile,
   default group, and initial group membership.
3. If an invite was present, the client redirects to `/join/<code>`.
4. `/join/[code]` calls `lookup_group_by_invite`; if the user is signed in and
   the code is valid, `join_group_by_invite` adds membership and makes that
   group active through `setActiveGroup`.
5. Users with incomplete onboarding are sent to `/onboarding`; users who already
   completed onboarding land on `/library`.

Invite codes are normalized by trimming, uppercasing, and removing characters
outside `A-Z` and `0-9`. Links should be generated with `groupJoinPath` or
`groupJoinUrl` so shared URLs match the route's expectations.

## Onboarding workflow

The wizard always starts with the group step:

1. **Group** - Keep the default personal group, join a friend's group by invite
   code, or create a group if no group exists.
2. **Games** - Add a few games inline. `OnboardingQuickAdd` can use BGG search
   or insert a title-only manual game and immediately creates an `ownership` row
   for the new user.
3. **App** - Show device-specific PWA install instructions and notification
   toggles. Push is shown only when the browser exposes service workers,
   `PushManager`, `Notification`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Email
   appears only when the server has Resend configured.
4. **Done** - `completeOnboarding` sets `profiles.onboarding_completed = true`
   and refreshes the layout before sending the user to home.

The inline manual add form is intentionally inside onboarding. Linking to the
full `/add-game` page before onboarding is complete would be intercepted by
middleware and redirected back to the wizard.

## PWA install guidance

`PwaInstallGuide` detects the platform in the browser:

- iOS includes iPhone/iPad user agents and iPadOS desktop user agents with touch.
- Android matches Android user agents.
- Everything else falls back to desktop guidance.

If the app is already running in standalone display mode, the guide shows an
installed-state message. Otherwise it gives platform-specific instructions:
Safari's **Add to Home Screen** path for iOS, browser menu install for Android,
and browser install UI for desktop. The onboarding copy calls out iPhone
installation because iOS push notifications require opening the installed PWA.

## Password reset operations

Password reset depends on Supabase Auth email delivery, not Resend. The app
builds the reset redirect from `window.location.origin`, so each deployed origin
that serves the app must be allowed in Supabase Auth redirect settings. The local
Supabase config uses `site_url = "http://127.0.0.1:3000"` and exposes the local
email testing UI on port `54324`.

Manual local smoke test:

1. Start the app and local Supabase stack.
2. Open `/forgot-password`, submit an existing account email, and inspect the
   local email UI at `http://127.0.0.1:54324`.
3. Open the reset link. It should pass through `/auth/callback` and land on
   `/reset-password`.
4. Set a new password of at least six characters, then confirm the user lands on
   `/library`.

Production checks:

- Supabase Auth has the public app URL in its site URL or redirect allow list.
- SMTP is configured in Supabase Auth if production reset emails should leave
  Supabase.
- The password policy in Supabase remains compatible with the client-side
  minimum length. Supabase is authoritative if it rejects a weak password.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Login redirects somewhere unexpected | The `redirect` query must be a relative path that starts with one `/`; unsafe values fall back to `/library`. |
| Invite link asks the user to sign in instead of joining | Expected for signed-out users. After signup or login, the redirect returns to `/join/<code>`. |
| Valid invite does not join a group | Confirm `lookup_group_by_invite` and `join_group_by_invite` are installed, the code normalizes to the expected value, and the user is not already a member. |
| New user loops back to onboarding | Confirm profile reads and the `onboarding_completed` update are allowed by RLS and that the local Supabase Data API grants are intact. |
| Manual add in onboarding fails | The user must have an active group, and inserts into `games` and `ownership` must pass RLS for that group. |
| Push toggle is missing | Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, serve the app from a secure context, and use a browser with service worker and Push API support. On iPhone, install and open the PWA first. |
| Email notification toggle is missing | Configure `RESEND_API_KEY` and `EMAIL_FROM`; this toggle is separate from Supabase Auth password reset email. |
| Reset email never arrives locally | Check Supabase's local email UI on port `54324`; local Auth email is captured there instead of being sent externally. |
| Reset link returns to login with `error=auth` | The code exchange failed or the redirect URL is not allowed by Supabase Auth. Request a fresh reset email after fixing Auth redirect settings. |
