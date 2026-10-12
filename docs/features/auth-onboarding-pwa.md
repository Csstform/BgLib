# Auth, onboarding, PWA install, and notifications

This guide documents the account entry points, first-run onboarding, installed
app behavior, and notification opt-ins.

## Intent

BgLib is designed to get a new member from signup to a usable group library with
as few decisions as possible:

1. Supabase Auth owns sign-in, signup, session refresh, and password reset.
2. Database triggers create a profile and default personal group for new users.
3. Middleware keeps incomplete users in onboarding until they choose a group,
   optionally add games, and review install/notification options.
4. The root layout registers the service worker and install prompt so the app can
   run as a mobile PWA.

## Primary codepaths

- `src/proxy.ts`
- `src/lib/supabase/middleware.ts`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingWizard.tsx`
- `src/components/OnboardingQuickAdd.tsx`
- `src/components/PwaInstallGuide.tsx`
- `src/components/InstallPrompt.tsx`
- `src/components/ServiceWorkerRegister.tsx`
- `src/components/PushNotificationToggle.tsx`
- `src/components/EmailNotificationToggle.tsx`
- `public/manifest.json`
- `public/sw.js`

## Auth and session flow

`src/proxy.ts` calls `updateSession` for all non-static routes when the public
Supabase URL and anon key are configured. If those variables are missing, the
proxy exits early so pages can show the setup banner instead of failing during
local setup.

`updateSession` refreshes Supabase cookies with `@supabase/ssr` and applies two
guards:

| Guard | Behavior |
|-------|----------|
| Protected route without a user | Redirects to `/login?redirect=<path>` for `/collection`, `/add-game`, `/profile`, `/loans`, `/game-nights/new`, `/picker`, and `/plays`. |
| Signed-in user with `profiles.onboarding_completed = false` | Redirects to `/onboarding` unless the path is onboarding, auth, join, login/signup, password reset, or an API route. |

Login accepts a safe relative `redirect` parameter. Absolute URLs and
protocol-relative values are ignored and the user lands on `/library`.

Signup sends `display_name` in Supabase user metadata. The database
`handle_new_user` trigger creates the profile, a default personal group, an owner
`group_members` row, and sets `profiles.active_group_id`. If signup came from a
group invite (`/signup?invite=<code>`), the client redirects to `/join/<code>`;
otherwise it redirects to `/library`, where the onboarding guard takes over.

## Password reset

The forgot-password form calls `supabase.auth.resetPasswordForEmail` with:

```text
<current origin>/auth/callback?next=/reset-password
```

The callback route exchanges the Supabase `code` for a session and redirects to
the validated `next` path. Invalid or missing codes redirect to
`/login?error=auth`. The reset form then calls `supabase.auth.updateUser` and
requires a password of at least six characters.

Operational constraint: the reset link is built from the browser's current
origin, so production and preview origins that send reset emails must be allowed
in the Supabase Auth redirect URL settings.

## Onboarding workflow

`/onboarding` requires a signed-in user and redirects completed users back to
`/library`. The wizard has four steps:

| Step | Behavior |
|------|----------|
| Group | Shows the default group created at signup. Users can keep it, enter a friend's invite code, or create/join a group when no group exists. |
| Games | Offers BGG search and a manual "Add by title" path through `OnboardingQuickAdd`. Manual add works without `BGG_API_TOKEN`; BGG search still needs the token. |
| App | Shows platform-specific install instructions plus push/email notification toggles when supported and configured. |
| Done | Calls `completeOnboarding`, sets `profiles.onboarding_completed = true`, and routes to Home. |

Group actions use server functions in `src/lib/group-actions.ts`.
`joinGroupByInvite` normalizes the code, joins through the `join_group_by_invite`
RPC, and sets the joined group active. `createGroup` calls the `create_group`
RPC and stores the active group in the `bglib_group_id` cookie.

## PWA install and offline behavior

The root layout registers:

- `ServiceWorkerRegister`, which registers `/sw.js` on load.
- `InstallPrompt`, which handles the browser `beforeinstallprompt` event and
  stores dismissals in `localStorage` key `bglib-install-dismissed`.

`PwaInstallGuide` detects iOS, Android, or desktop from user agent/platform data
and shows platform-specific instructions. iOS users are told to use Safari and
**Add to Home Screen**; this is required for iOS push notification support.

The web app manifest declares standalone display, portrait orientation, theme
colors, and 192/512/maskable icons. The service worker caches `/`,
`/manifest.json`, navigated GET responses, and `/api/library` for offline
library browsing. Offline cache is read-only; data mutations still require the
network.

## Notification opt-ins

Push notifications require all of:

- browser support for service workers, Push API, and Notifications
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- a registered subscription row in `push_subscriptions`

`PushNotificationToggle` requests notification permission, registers `/sw.js`,
subscribes with the VAPID public key, and upserts the endpoint plus browser keys
through `POST /api/push/subscribe`. Turning it off calls
`DELETE /api/push/subscribe` and unsubscribes the browser endpoint.

Email notifications are shown only when `RESEND_API_KEY` and `EMAIL_FROM` are
configured. The toggle updates `profiles.email_notifications`; email sends also
need `SUPABASE_SERVICE_ROLE_KEY` so the server can resolve Supabase Auth email
addresses.

## Operational checklist

When deploying or debugging account setup:

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; otherwise
   auth-aware pages show the setup banner and middleware does not run.
2. Run `supabase/install.sql` on fresh projects so `handle_new_user`,
   `create_group`, `join_group_by_invite`, and onboarding columns exist.
3. Add each deployed origin and `/auth/callback` reset target to Supabase Auth
   redirect allow-lists.
4. Generate VAPID keys with `npx web-push generate-vapid-keys` before testing
   push notifications.
5. Verify `manifest.json`, `/sw.js`, and icon files are served from the public
   origin before testing install prompts.
6. Use Safari's **Add to Home Screen** flow on iOS; browser shortcuts or "Add to
   Dock" do not provide the same installed PWA behavior.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| New users keep returning to onboarding | Confirm the `profiles.onboarding_completed` update succeeds and the user can update their profile under RLS. |
| Signup succeeds but no group appears | Confirm `handle_new_user` from `supabase/install.sql` or migration `003` is installed. |
| Invite signup does not join the group | Confirm the invite code is valid and `join_group_by_invite` is installed/granted. |
| Reset email returns to login with `error=auth` | The Supabase callback did not include a usable `code`; check Auth redirect URL settings and whether the reset link origin matches the deployed app. |
| Push toggle is missing | Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and use a browser with service worker, Push API, and Notification support. |
| Push toggle errors or sends nothing | Check notification permission, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and whether stale endpoints were pruned after 404/410 responses. |
| Email toggle is missing | Set both `RESEND_API_KEY` and `EMAIL_FROM`. |
| Install prompt never appears | The app may already be installed, the prompt was dismissed in `localStorage`, the browser does not fire `beforeinstallprompt`, or manifest/service-worker assets are not served correctly. |
