"use client";

import { useState, useMemo, type CSSProperties } from "react";
import { Layers, List } from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { SearchBar } from "@/components/SearchBar";
import { groupLibraryGames, type LibraryEntry } from "@/lib/game-expansions";
import type { GameWithOwners } from "@/lib/types";

type ViewMode = "nested" | "flat";

export function LibraryClient({ games }: { games: GameWithOwners[] }) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("nested");

  const grouped = useMemo(() => groupLibraryGames(games), [games]);

  const flatGames = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.owners?.some((o) => o.display_name.toLowerCase().includes(q))
    );
  }, [games, search]);

  const nestedBases = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return grouped.bases;

    return grouped.bases
      .map((base) => {
        const baseMatches =
          base.title.toLowerCase().includes(q) ||
          base.owners?.some((o) => o.display_name.toLowerCase().includes(q));

        const matchingExpansions = (base.expansions ?? []).filter(
          (exp) =>
            exp.title.toLowerCase().includes(q) ||
            exp.owners?.some((o) => o.display_name.toLowerCase().includes(q))
        );

        if (baseMatches) return base;
        if (matchingExpansions.length > 0) {
          return { ...base, expansions: matchingExpansions };
        }
        return null;
      })
      .filter(Boolean) as LibraryEntry[];
  }, [grouped.bases, search]);

  const nestedOrphans = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return grouped.orphanExpansions;
    return grouped.orphanExpansions.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.owners?.some((o) => o.display_name.toLowerCase().includes(q))
    );
  }, [grouped.orphanExpansions, search]);

  const displayCount =
    viewMode === "flat"
      ? flatGames.length
      : nestedBases.length + nestedOrphans.length;

  const isEmpty =
    viewMode === "flat"
      ? flatGames.length === 0
      : nestedBases.length === 0 && nestedOrphans.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SearchBar value={search} onChange={setSearch} className="flex-1" />
        <div className="flex rounded-xl border border-border bg-surface p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("nested")}
            className={`rounded-lg p-2 ${
              viewMode === "nested"
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-foreground"
            }`}
            title="Grouped view"
            aria-label="Grouped view"
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`rounded-lg p-2 ${
              viewMode === "flat"
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-foreground"
            }`}
            title="Flat list"
            aria-label="Flat list"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-center text-muted py-8">
          {search ? "No games match your search." : "No games in the library yet."}
        </p>
      ) : viewMode === "flat" ? (
        <div className="space-y-2">
          {flatGames.map((game, i) => (
            <div
              key={game.id}
              className="stagger-item"
              style={{ "--stagger": i } as CSSProperties}
            >
              <GameCard game={game} badge={expansionBadge(game)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {nestedBases.map((base, i) => (
            <div
              key={base.id}
              className="stagger-item space-y-1"
              style={{ "--stagger": i } as CSSProperties}
            >
              <GameCard game={base} />
              {(base.expansions ?? []).length > 0 && (
                <div className="ml-4 space-y-1 border-l-2 border-border pl-3">
                  {base.expansions!.map((exp) => (
                    <GameCard
                      key={exp.id}
                      game={exp}
                      badge="Expansion"
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {nestedOrphans.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted px-1">
                Expansions (base not in library)
              </p>
              {nestedOrphans.map((game, i) => (
                <div
                  key={game.id}
                  className="stagger-item"
                  style={{ "--stagger": i } as CSSProperties}
                >
                  <GameCard game={game} badge="Expansion" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!search && (
        <p className="text-xs text-muted text-center">
          {displayCount} game{displayCount !== 1 ? "s" : ""} shown
          {viewMode === "nested" ? " (grouped)" : ""}
        </p>
      )}
    </div>
  );
}

function expansionBadge(game: GameWithOwners): string | null {
  if (game.bgg_type === "boardgameexpansion" || game.base_game_id) {
    return "Expansion";
  }
  return null;
}
