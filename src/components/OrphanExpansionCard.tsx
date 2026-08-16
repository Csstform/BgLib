"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameSelect } from "@/components/GameSelect";
import { GameCover } from "@/components/ui/GameCover";
import type { Game, GameWithOwners } from "@/lib/types";

export function OrphanExpansionCard({
  expansion,
  baseGames,
  defaultOpen = false,
}: {
  expansion: GameWithOwners;
  baseGames: Pick<Game, "id" | "title">[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [baseGameId, setBaseGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState(defaultOpen);

  async function linkManual(e: React.FormEvent) {
    e.preventDefault();
    if (!baseGameId) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const res = await fetch(`/api/games/${expansion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_game_id: baseGameId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to link expansion");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
        Linked &ldquo;{expansion.title}&rdquo; successfully.
      </div>
    );
  }

  return (
    <div
      id={`expansion-${expansion.id}`}
      className="rounded-xl border border-border bg-surface overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="touch-card flex w-full items-center gap-3 p-3 text-left"
      >
        <GameCover
          src={expansion.image_url}
          alt={expansion.title}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{expansion.title}</p>
          <p className="text-xs text-muted">
            {expansion.owners.length > 0
              ? expansion.owners.map((o) => o.display_name).join(", ")
              : "No owners"}
            {expansion.bgg_id ? ` · BGG ${expansion.bgg_id}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-primary">
          {expanded ? "Hide" : "Link"}
        </span>
      </button>

      {expanded && (
        <form
          onSubmit={linkManual}
          className="space-y-2 border-t border-border bg-surface-2/50 p-3"
        >
          <label className="block text-xs font-medium text-muted">
            Search for the base game
          </label>
          <GameSelect
            games={baseGames as Game[]}
            value={baseGameId}
            onChange={setBaseGameId}
            required
            placeholder="Search base games..."
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !baseGameId}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {loading ? "Linking..." : "Link to base game"}
          </button>
        </form>
      )}
    </div>
  );
}
