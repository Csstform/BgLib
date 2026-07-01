import Link from "next/link";
import { Users } from "lucide-react";
import type { GameWithOwners } from "@/lib/types";
import { formatPlayTime, formatPlayers } from "@/lib/utils";
import { OwnerAvatars } from "./OwnerAvatars";

export function GameCard({ game }: { game: GameWithOwners }) {
  const ownerCount = game.owners?.length ?? 0;

  return (
    <Link
      href={`/library/${game.id}`}
      className="group touch-card flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-2xl overflow-hidden">
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
        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
          {game.title}
        </h3>
        <p className="text-sm text-muted">
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
