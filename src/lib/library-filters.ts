import type { GameWithOwners, OwnerInfo } from "@/lib/types";

export type LibraryFilters = {
  ownerId: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  maxPlayTime: number | null;
  unplayedOnly: boolean;
  noOwnersOnly: boolean;
  maxWeight: number | null;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  ownerId: null,
  minPlayers: null,
  maxPlayers: null,
  maxPlayTime: null,
  unplayedOnly: false,
  noOwnersOnly: false,
  maxWeight: null,
};

export const NO_OWNERS_FILTER_VALUE = "__none__";

export function hasActiveLibraryFilters(filters: LibraryFilters): boolean {
  return (
    filters.ownerId != null ||
    filters.minPlayers != null ||
    filters.maxPlayers != null ||
    filters.maxPlayTime != null ||
    filters.unplayedOnly ||
    filters.noOwnersOnly ||
    filters.maxWeight != null
  );
}

export function applyLibraryFilters(
  games: GameWithOwners[],
  filters: LibraryFilters,
  opts: {
    lastPlayedByGameId?: Record<string, string>;
    playedGameIds?: Set<string> | Record<string, unknown>;
  } = {}
): GameWithOwners[] {
  return games.filter((game) => {
    const owners = game.owners ?? [];

    if (filters.noOwnersOnly && owners.length > 0) {
      return false;
    }

    if (filters.ownerId && !owners.some((o) => o.user_id === filters.ownerId)) {
      return false;
    }

    if (filters.minPlayers !== null && (game.max_players ?? 99) < filters.minPlayers) {
      return false;
    }

    if (filters.maxPlayers !== null && game.min_players > filters.maxPlayers) {
      return false;
    }

    if (
      filters.maxPlayTime !== null &&
      game.play_time_minutes &&
      game.play_time_minutes > filters.maxPlayTime
    ) {
      return false;
    }

    if (filters.unplayedOnly) {
      const played = opts.playedGameIds;
      const hasPlay =
        (played instanceof Set && played.has(game.id)) ||
        (played && !(played instanceof Set) && played[game.id]) ||
        !!opts.lastPlayedByGameId?.[game.id];
      if (hasPlay) return false;
    }

    if (
      filters.maxWeight !== null &&
      game.bgg_weight != null &&
      game.bgg_weight > filters.maxWeight
    ) {
      return false;
    }

    return true;
  });
}

export function uniqueOwners(games: GameWithOwners[]): OwnerInfo[] {
  const byId = new Map<string, OwnerInfo>();
  for (const game of games) {
    for (const owner of game.owners ?? []) {
      if (!byId.has(owner.user_id)) {
        byId.set(owner.user_id, owner);
      }
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  );
}
