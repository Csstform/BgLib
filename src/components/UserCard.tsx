import Link from "next/link";
import { Dices } from "lucide-react";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";

export function UserCard({
  profile,
  gameCount,
  role,
  groupId,
  currentUserId,
  canRemove,
}: {
  profile: Profile;
  gameCount: number;
  role?: string;
  groupId?: string;
  currentUserId?: string;
  canRemove?: boolean;
}) {
  const showRemove =
    canRemove &&
    groupId &&
    currentUserId &&
    profile.id !== currentUserId &&
    role !== "owner";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/users/${profile.id}`}
        className="touch-card flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 font-medium text-primary">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(profile.display_name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{profile.display_name}</h3>
            {role && (
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {role}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-muted">
            <Dices className="h-3.5 w-3.5" />
            {gameCount} game{gameCount !== 1 ? "s" : ""}
          </p>
        </div>
      </Link>
      {showRemove && (
        <RemoveMemberButton
          groupId={groupId}
          userId={profile.id}
          displayName={profile.display_name}
        />
      )}
    </div>
  );
}
