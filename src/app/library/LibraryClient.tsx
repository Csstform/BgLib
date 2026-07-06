"use client";

import { useState, useMemo, useEffect, useCallback, type CSSProperties } from "react";
import { Layers, List, Library, WifiOff } from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { SearchBar } from "@/components/SearchBar";
import { LibraryFiltersPanel } from "@/components/LibraryFiltersPanel";
import { LibraryDuplicatesPanel } from "@/components/LibraryDuplicatesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupLibraryGames } from "@/lib/game-expansions";
import { findDuplicateClusters } from "@/lib/duplicate-detection";
import {
  applyLibraryFilters,
  DEFAULT_LIBRARY_FILTERS,
  uniqueOwners,
  type LibraryFilters,
} from "@/lib/library-filters";
import {
  cacheLibrary,
  getCachedLibrary,
  isOffline,
} from "@/lib/offline-library";
import { REALTIME_CHANGED_EVENT } from "@/lib/realtime-scope";
import { parseJsonResponse } from "@/lib/parse-json-response";
import { formatDateTime } from "@/lib/utils";
import type { GameWithOwners } from "@/lib/types";

type ViewMode = "nested" | "flat";

export function LibraryClient({
  groupId,
  games: initialGames,
  lastPlayedByGameId: initialLastPlayed,
  userId,
}: {
  groupId: string;
  games: GameWithOwners[];
  lastPlayedByGameId: Record<string, string>;
  userId?: string;
}) {
  const [games, setGames] = useState(initialGames);
  const [lastPlayedByGameId, setLastPlayedByGameId] = useState(initialLastPlayed);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("nested");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const refreshFromApi = useCallback(async () => {
    if (offline) return;
    try {
      const res = await fetch("/api/library");
      const data = await parseJsonResponse<{
        games: GameWithOwners[];
        lastPlayedByGameId: Record<string, string>;
      }>(res);
      if (!res.ok) return;
      setGames(data.games);
      setLastPlayedByGameId(data.lastPlayedByGameId);
      cacheLibrary(groupId, data.games).catch(() => {});
    } catch {
      // Network error — keep current list
    }
  }, [groupId, offline]);

  useEffect(() => {
    setGames(initialGames);
    setLastPlayedByGameId(initialLastPlayed);
    cacheLibrary(groupId, initialGames).catch(() => {});
  }, [groupId, initialGames, initialLastPlayed]);

  useEffect(() => {
    function onRealtimeChange() {
      refreshFromApi();
    }
    window.addEventListener(REALTIME_CHANGED_EVENT, onRealtimeChange);
    return () =>
      window.removeEventListener(REALTIME_CHANGED_EVENT, onRealtimeChange);
  }, [refreshFromApi]);

  useEffect(() => {
    function handleOnline() {
      setOffline(false);
    }
    function handleOffline() {
      setOffline(true);
    }
    setOffline(isOffline());
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!offline) return;
    getCachedLibrary(groupId).then((cached) => {
      if (cached) {
        setGames(cached.games);
        setCachedAt(cached.cachedAt);
      }
    });
  }, [offline, groupId]);

  const owners = useMemo(() => uniqueOwners(games), [games]);

  const filteredGames = useMemo(() => {
    const filtered = applyLibraryFilters(games, filters, {
      userId,
      lastPlayedByGameId,
    });
    const q = search.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.owners?.some((o) => o.display_name.toLowerCase().includes(q))
    );
  }, [games, filters, userId, lastPlayedByGameId, search]);

  const grouped = useMemo(
    () => groupLibraryGames(filteredGames),
    [filteredGames]
  );

  const duplicateClusters = useMemo(
    () => findDuplicateClusters(games),
    [games]
  );

  const displayCount =
    viewMode === "flat"
      ? filteredGames.length
      : grouped.bases.length + grouped.orphanExpansions.length;

  const isEmpty =
    viewMode === "flat"
      ? filteredGames.length === 0
      : grouped.bases.length === 0 && grouped.orphanExpansions.length === 0;

  return (
    <div className="space-y-4">
      {offline && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Offline
            {cachedAt
              ? ` — showing library cached ${formatDateTime(cachedAt)}`
              : " — limited browsing"}
          </span>
        </div>
      )}

      <LibraryDuplicatesPanel clusters={duplicateClusters} />

      <div className="flex items-start gap-2">
        <SearchBar value={search} onChange={setSearch} className="flex-1" />
        <LibraryFiltersPanel
          filters={filters}
          onChange={setFilters}
          owners={owners}
          userId={userId}
        />
        <div className="flex shrink-0 rounded-xl border border-border bg-surface p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("nested")}
            className={`touch-target pressable rounded-lg p-2.5 ${
              viewMode === "nested"
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-foreground"
            }`}
            title="Grouped view"
            aria-label="Grouped view"
            aria-pressed={viewMode === "nested"}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`touch-target pressable rounded-lg p-2.5 ${
              viewMode === "flat"
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-foreground"
            }`}
            title="Flat list"
            aria-label="Flat list"
            aria-pressed={viewMode === "flat"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Library}
          title={
            search || filters.ownerId
              ? "No games match your filters"
              : "Your library is empty"
          }
          description={
            search || filters.ownerId
              ? "Try a different search or clear your filters."
              : "Add your group's first game to get started."
          }
          action={
            !search && !filters.ownerId
              ? { href: "/add-game", label: "Add a game" }
              : undefined
          }
        />
      ) : viewMode === "flat" ? (
        <div className="space-y-2">
          {filteredGames.map((game, i) => (
            <div
              key={game.id}
              className="stagger-item"
              style={{ "--stagger": i } as CSSProperties}
            >
              <GameCard
                game={game}
                badge={expansionBadge(game)}
                lastPlayed={lastPlayedByGameId[game.id]}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.bases.map((base, i) => (
            <div
              key={base.id}
              className="stagger-item space-y-1"
              style={{ "--stagger": i } as CSSProperties}
            >
              <GameCard
                game={base}
                lastPlayed={lastPlayedByGameId[base.id]}
              />
              {(base.expansions ?? []).length > 0 && (
                <div className="ml-4 space-y-1 border-l-2 border-border pl-3">
                  {base.expansions!.map((exp) => (
                    <GameCard
                      key={exp.id}
                      game={exp}
                      badge="Expansion"
                      compact
                      lastPlayed={lastPlayedByGameId[exp.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {grouped.orphanExpansions.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted px-1">
                Expansions (base not in library)
              </p>
              {grouped.orphanExpansions.map((game, i) => (
                <div
                  key={game.id}
                  className="stagger-item"
                  style={{ "--stagger": i } as CSSProperties}
                >
                  <GameCard
                    game={game}
                    badge="Expansion"
                    lastPlayed={lastPlayedByGameId[game.id]}
                  />
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
