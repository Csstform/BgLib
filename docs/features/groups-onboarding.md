# Groups, onboarding, and invite joins

This guide documents how BgLib creates a user's first group, chooses the active
group, lets friends join by invite, and gates first-run setup.

## Intent

Every user works inside one active group. The active group scopes the shared
catalogue, ownership, game nights, plays, loans, wants, and member list. New
accounts get a personal library automatically so the app is usable immediately,
then onboarding helps them keep that group, join a friend's group, seed games,
install the PWA, and enable notifications.

## Primary codepaths

- `src/lib/group.ts`
- `src/lib/group-actions.ts`
- `src/lib/group-constants.ts`
- `src/lib/group-invite.ts`
- `src/lib/supabase/middleware.ts`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingWizard.tsx`
- `src/app/join/[code]/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/login/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/GroupSwitcher.tsx`
- `src/components/GroupSettingsCard.tsx`
- `src/components/GroupInviteCard.tsx`
- `src/components/JoinGroupCard.tsx`
- `src/app/users/page.tsx`
- `src/components/UserCard.tsx`

## Data model and RPCs

| Table / function | Purpose |
|------------------|---------|
| `profiles.onboarding_completed` | Middleware gate for first-run setup. Existing users were backfilled to `true` by migration `003`; new signups start as `false`. |
| `profiles.active_group_id` | Server-side active group preference used after membership is verified. |
| `groups` | Group name, optional description, generated `invite_code`, creator, and creation time. |
| `group_members` | User membership and role. Roles allowed by the database are `owner`, `admin`, and `member`; current UI treats owners as the management role. |
| `create_group(group_name, group_description)` | Security-definer RPC that creates a group, adds the caller as owner, and switches `profiles.active_group_id`. |
| `join_group_by_invite(invite)` | Security-definer RPC that uppercases the invite code, adds the caller as member, and switches `profiles.active_group_id`. Existing memberships are ignored via `on conflict do nothing`. |
| `lookup_group_by_invite(invite)` | Public security-definer lookup used by `/join/<code>` to show the group name before the visitor is a member. |

Schema support lives in:

- `supabase/migrations/003_priority_features.sql`
- `supabase/migrations/006_fix_group_members_rls.sql`
- `supabase/migrations/007_fix_group_create_rls.sql`
- `supabase/migrations/013_group_member_management.sql`
- `supabase/migrations/016_lookup_group_by_invite.sql`

Fresh installs through `supabase/install.sql` include all of these.

## Signup and onboarding flow

1. `handle_new_user()` creates a profile, a default group named from the
   display name, an owner membership, and `profiles.active_group_id`.
2. `/signup` passes `display_name` in Supabase auth metadata. If the signup URL
   has `?invite=<code>`, the client normalizes the code and sends the new user
   to `/join/<code>` after Supabase signs them in.
3. Middleware redirects signed-in users with `onboarding_completed = false` to
   `/onboarding`, except for auth, join, onboarding, and API paths.
4. The onboarding wizard starts with the current default group when one exists.
   Users can continue with it or enter a friend's invite code.
5. The games step uses `OnboardingQuickAdd` to add a few games to the active
   group, but users can skip and import a full BGG collection later from
   Profile.
6. The app step shows PWA install guidance and optional notification toggles.
7. Finishing calls `completeOnboarding()`, sets `onboarding_completed = true`,
   and refreshes the app shell.

If a user tries to visit a protected feature before onboarding is complete,
middleware sends them back to `/onboarding`. `/add-game` is protected by this
gate, so the onboarding quick-add component is the intended way to add games
before completion.

## Active group resolution

`getActiveGroupId()` resolves the active group in this order:

1. `bglib_group_id` cookie, only if the signed-in user is still a member.
2. `profiles.active_group_id`, again only if membership is still valid.
3. The first `group_members` row for the user.
4. `null` when the user is signed out or has no memberships.

`setActiveGroup(groupId)` validates membership before updating
`profiles.active_group_id`, writes the one-year `bglib_group_id` cookie, and
revalidates the app layout. `GroupSwitcher` calls this from the header when a
user belongs to multiple groups.

Most feature pages and API routes call `getActiveGroupId()` or `requireGroupId()`
before reading or mutating group data. Supabase RLS policies also require group
membership for group-scoped tables, so UI state and database enforcement should
agree.

## Invites and joining

Invite codes are generated as uppercase 8-character strings from UUID bytes.
Client helpers normalize user-entered codes by trimming, uppercasing, and
removing non-alphanumeric characters.

Group invite surfaces:

- Profile's **Your group** section shows `GroupInviteCard`, which copies the raw
  code or a share message. Share links use `NEXT_PUBLIC_APP_URL` when set,
  otherwise the browser origin.
- `JoinGroupCard` in Profile lets a signed-in user join another group by code
  and switches them to it.
- `/join/<code>` works for signed-out recipients by showing the group name and
  linking to signup or login. Signup preserves the invite as `?invite=<code>`;
  login uses `?redirect=/join/<code>`.

Signed-in visitors to `/join/<code>` are joined through `joinGroupByInvite()`.
They land on `/library` if onboarding is complete, otherwise `/onboarding`.
Invalid or stale codes show an error instead of exposing private group data.

## Managing members and groups

The Profile page's **Your group** section is the management surface:

- Owners can rename the active group and update its description.
- Any member can create another group. The app switches to the new group
  automatically; the form can also copy that user's collection from the previous
  group.
- Any member can leave a group unless they are the only owner.
- Owners can remove non-owner members from the Players page. Owners cannot
  remove themselves through that control, and the database policy also prevents
  removing another owner.
- When a user leaves or is removed from their active group, server actions move
  their `active_group_id` to another remaining membership when possible, or clear
  it when no groups remain.

The Players page lists members of the active group, their role, and how many
games they own in that group. Member profile pages intentionally show collection
and play stats scoped to the viewer's active group.

## Operational checklist

When deploying or debugging group setup:

1. Confirm migrations `003`, `006`, `007`, `013`, and `016` have run, or use a
   fresh `supabase/install.sql`.
2. Confirm `groups` and `group_members` are readable through the app for members;
   local Supabase must keep `auto_expose_new_tables = true` as documented in
   `supabase/config.toml`.
3. Test a new signup without an invite and verify the default group appears in
   the header.
4. Test a signup or login from `/join/<code>` and verify the user joins that
   group and the active group switches.
5. Test owner-only actions from Profile and Players with at least two members.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| New user keeps returning to onboarding | Verify `profiles.onboarding_completed` can be updated by the signed-in user and that local Supabase grants/RLS match `supabase/install.sql`. |
| Header shows the wrong group | Check whether the `bglib_group_id` cookie points at a group the user still belongs to; otherwise inspect `profiles.active_group_id`. |
| Invite link shows no group | Confirm the code after normalization matches `groups.invite_code` and that migration `016_lookup_group_by_invite.sql` has run. |
| Joining by code succeeds but data looks empty | The user may have joined a different group than expected; use the header switcher or Profile's **Your group** section to confirm the active group. |
| Owner cannot leave | Expected when they are the only owner of that group. There is no owner-promotion UI yet, so keep the group or make an intentional role change outside the app. |
| Owner cannot remove a member | The target cannot be the current user or another owner, and migration `013_group_member_management.sql` must be present. |
