# Groups, invites, and onboarding

This guide documents the account setup path, active-group selection, invite
links, and group management workflows.

## Intent

BgLib is group-scoped: the active group determines which catalogue, ownership,
plays, loans, game nights, and stats a user sees. New accounts normally start
with a default group, but users can join or create more groups and switch
between them.

The onboarding flow exists to make that first usable group explicit, seed a few
games if desired, and explain app installation and notifications before the rest
of the app becomes the default destination.

## Primary codepaths

- `src/app/signup/page.tsx`
- `src/app/login/page.tsx`
- `src/app/join/[code]/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/OnboardingWizard.tsx`
- `src/app/profile/page.tsx`
- `src/app/users/page.tsx`
- `src/components/GroupSwitcher.tsx`
- `src/components/GroupSettingsCard.tsx`
- `src/components/GroupInviteCard.tsx`
- `src/components/JoinGroupCard.tsx`
- `src/lib/group.ts`
- `src/lib/group-actions.ts`
- `src/lib/group-invite.ts`
- `src/lib/supabase/middleware.ts`

## Data model

| Table / column | Purpose |
|----------------|---------|
| `groups.invite_code` | Unique code shared with friends. Invite links normalize to this code. |
| `groups.created_by` | Profile that created the group. |
| `group_members.role` | `owner` or `member`; owners can rename the group and remove non-owner members. |
| `profiles.active_group_id` | Preferred group for server loads and the next session. |
| `profiles.onboarding_completed` | Gates most signed-in routes until setup is complete. |

Schema support lives in:

- `supabase/migrations/003_priority_features.sql` for groups, default group
  creation, active-group profile fields, and invite joining
- `supabase/migrations/007_fix_group_create_rls.sql` for the `create_group`
  RPC used by onboarding and profile group creation
- `supabase/migrations/013_group_member_management.sql` for owner removal of
  non-owner members
- `supabase/migrations/016_lookup_group_by_invite.sql` for public invite-link
  previews before a visitor has joined the group

## Signup and onboarding workflow

1. `/signup` creates a Supabase Auth user and passes `display_name` in auth
   metadata.
2. The database `handle_new_user` trigger creates the profile, a default group
   named from the display name, an owner membership row, and
   `profiles.active_group_id`.
3. New signed-in users whose profile has `onboarding_completed = false` are
   redirected by middleware to `/onboarding` for non-exempt app routes.
4. The onboarding wizard walks through:
   - **Group**: continue with the default group, create a new group, or join an
     invite code.
   - **Games**: optionally quick-add games with `OnboardingQuickAdd`.
   - **App**: show PWA install instructions and notification toggles.
   - **Done**: call `completeOnboarding`, set `onboarding_completed = true`,
     and send the user to the home page.

Middleware exempts `/onboarding`, `/login`, `/signup`, password reset pages,
`/join`, `/auth`, and `/api` from the onboarding redirect so auth and invite
handoffs can complete.

## Active group selection

`getActiveGroupId` resolves the active group in this order:

1. the `GROUP_COOKIE`, if the signed-in user is still a member;
2. `profiles.active_group_id`, if the user is still a member;
3. the first remaining `group_members` row for the user.

`setActiveGroup` verifies membership, writes `profiles.active_group_id`, sets
the long-lived group cookie, and revalidates the app layout. `createGroup` and
`joinGroupByInvite` both switch the user to the resulting group.

Most feature code calls `getActiveGroupId` or `requireGroupId` rather than
accepting a group id from the client. When adding APIs, prefer the same pattern
unless the workflow explicitly needs both a source and target group, like
`POST /api/groups/copy-library`.

## Invite links and joining

Invite codes are normalized by `normalizeInviteCode`: trim, uppercase, and strip
non-alphanumeric characters. `GroupInviteCard` builds copy/share text with:

```text
Join "Friday Night Board Gamers" on BgLib!

Invite code: ABCD1234
Join link: https://example.com/join/ABCD1234

Open the link, or sign up and enter the invite code.
```

The join route supports both authenticated and unauthenticated visitors:

1. `/join/[code]` normalizes the path segment.
2. It calls `lookup_group_by_invite` to show the group name before membership.
   This RPC is `security definer` and granted to `anon` and `authenticated`
   because normal group RLS only lets existing members read `groups`.
3. A signed-in visitor calls `joinGroupByInvite`, which inserts a member row with
   role `member`, updates `active_group_id`, and redirects to `/library` or
   `/onboarding` depending on `onboarding_completed`.
4. A signed-out visitor gets links to `/signup?invite=CODE` or
   `/login?redirect=/join/CODE`.

If the code does not resolve, the page stays public and reports that no group
uses the invite code.

## Profile group management

The profile page is the group operations hub:

- owners can rename the active group and edit its description;
- all users can copy/share the active group's invite;
- users can create another group and optionally copy their own collection from
  the current group;
- users can enter another group's invite code;
- users can leave a group, unless they are its only owner;
- owners can remove non-owner members from `/users`.

Leaving or removing a member updates `profiles.active_group_id` when the
departed group was active. If no groups remain for the leaving user, the group
cookie is deleted and active-group resolution returns `null` until they join or
create another group.

## Constraints and troubleshooting

| Symptom | Check |
|---------|-------|
| Invite link shows no group | Confirm the code after normalization matches `groups.invite_code`; `lookup_group_by_invite` only trims and uppercases in SQL. |
| User joins but lands in onboarding | This is expected until `profiles.onboarding_completed` is true. Finish the wizard to reach the main app. |
| Group switch does not stick | Verify the user is a member of the target group; invalid cookie/profile values are ignored by `getActiveGroupId`. |
| Owner cannot leave | A sole owner is blocked from leaving so the group is not left ownerless. Add ownership-transfer support before changing that rule. |
| Invite previews fail locally with permission errors | Ensure the local database includes migration `016_lookup_group_by_invite.sql` or `supabase/install.sql`, including the execute grant to `anon` and `authenticated`. |
