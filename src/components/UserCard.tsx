import Link from "next/link";
import { Dices } from "lucide-react";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export function UserCard({
  profile,
  gameCount,
}: {
  profile: Profile;
  gameCount: number;
}) {
  return (
    <Link
      href={`/users/${profile.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 font-medium text-primary overflow-hidden shrink-0">
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
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{profile.display_name}</h3>
        <p className="text-sm text-muted flex items-center gap-1">
          <Dices className="h-3.5 w-3.5" />
          {gameCount} game{gameCount !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
