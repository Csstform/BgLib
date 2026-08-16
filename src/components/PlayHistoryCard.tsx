"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Trash2, Trophy } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { GameCover } from "@/components/ui/GameCover";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type PlayCardProps = {
  play: {
    id: string;
    played_at: string;
    duration_minutes: number | null;
    notes: string | null;
    logged_by: string;
    game: { id: string; title: string; image_url: string | null } | null;
    logger: { display_name: string } | null;
    winnerNames: string[];
    otherParticipants: string[];
    expansionTitles: string[];
  };
  currentUserId?: string;
};

export function PlayHistoryCard({ play, currentUserId }: PlayCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDelete = currentUserId === play.logged_by;
  const game = play.game;

  async function handleDelete() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/plays/${play.id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to delete play");
      setLoading(false);
      return;
    }

    setConfirmOpen(false);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="relative rounded-xl border border-border bg-surface">
      <Link
        href={game ? `/library/${game.id}` : "/plays"}
        className="touch-card flex gap-3 p-3"
      >
        <GameCover
          src={game?.image_url}
          alt={game?.title ?? "Game"}
          size="sm"
        />
        <div className="min-w-0 flex-1 pr-16">
          <p className="truncate font-semibold">{game?.title ?? "Unknown"}</p>
          <p className="text-sm text-muted">
            {formatDateTime(play.played_at)}
            {play.duration_minutes ? ` · ${play.duration_minutes} min` : ""}
          </p>
          {play.winnerNames.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              {play.winnerNames.join(", ")}
            </p>
          )}
          {play.otherParticipants.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              With: {play.otherParticipants.join(", ")}
            </p>
          )}
          {play.expansionTitles.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              + {play.expansionTitles.join(", ")}
            </p>
          )}
          {play.notes && (
            <p className="mt-1 line-clamp-2 text-xs italic text-muted">
              {play.notes}
            </p>
          )}
          <p className="mt-1 text-xs text-muted/80">
            Logged by {play.logger?.display_name ?? "Unknown"}
          </p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      </Link>
      {canDelete && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <Link
            href={`/plays/${play.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Edit play"
            className="pressable touch-target flex items-center justify-center rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            disabled={loading}
            aria-label="Delete play"
            className="pressable touch-target flex items-center justify-center rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete play?"
        description={`Delete the play of "${game?.title ?? "this game"}" from ${formatDateTime(play.played_at)}?\n\nThis cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
