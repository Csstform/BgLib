import Link from "next/link";
import { Users } from "lucide-react";
import type { GameWithOwners } from "@/lib/types";
import { formatPlayTime, formatPlayers } from "@/lib/utils";
import { OwnerAvatars } from "./OwnerAvatars";

export function GameCard({
  game,
  badge,
  compact,
}: {
  game: GameWithOwners;
  badge?: string | null;
  compact?: boolean;
}) {
  const ownerCount = game.owners?.length ?? 0;

  return (
    <Link
      href={`/library/${game.id}`}
      className={`group touch-card flex gap-3 rounded-xl border border-border bg-surface shadow-sm ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-2 overflow-hidden ${
          compact ? "h-12 w-12 text-xl" : "h-16 w-16 text-2xl"
        }`}
      >
        {game.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image_url}
            alt={game.title}
            className="h-full w-full object-cover"
          />
        ) : (
          "🎲"
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={`font-semibold truncate group-hover:text-primary transition-colors ${
              compact ? "text-sm" : ""
            }`}
          >
            {game.title}
          </h3>
          {badge && (
            <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
              {badge}
            </span>
          )}
        </div>
        <p className={`text-muted ${compact ? "text-xs" : "text-sm"}`}>
          {formatPlayers(game.min_players, game.max_players)} players
          {game.play_time_minutes
            ? ` · ${formatPlayTime(game.play_time_minutes)}`
            : ""}
        </p>
        {ownerCount > 0 ? (
          <div className="mt-1 flex items-center gap-1.5">
            <OwnerAvatars owners={game.owners} max={3} size="sm" />
            <span className="text-xs text-muted">
              {ownerCount} owner{ownerCount !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <span className="mt-1 text-xs text-muted flex items-center gap-1">
            <Users className="h-3 w-3" /> No owners yet
          </span>
        )}
      </div>
    </Link>
  );
}
