import type { GameWithOwners, OwnerInfo } from "@/lib/types";

export type LibraryFilters = {
  ownerId: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  maxPlayTime: number | null;
  unplayedOnly: boolean;
  ownedByMeOnly: boolean;
  noOwnersOnly: boolean;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  ownerId: null,
  minPlayers: null,
  maxPlayers: null,
  maxPlayTime: null,
  unplayedOnly: false,
  ownedByMeOnly: false,
  noOwnersOnly: false,
};

export function applyLibraryFilters(
  games: GameWithOwners[],
  filters: LibraryFilters,
  opts: {
    userId?: string;
    lastPlayedByGameId?: Record<string, string>;
  }
): GameWithOwners[] {
  return games.filter((game) => {
    const owners = game.owners ?? [];

    if (filters.ownerId && !owners.some((o) => o.user_id === filters.ownerId)) {
      return false;
    }

    if (filters.ownedByMeOnly && opts.userId) {
      if (!owners.some((o) => o.user_id === opts.userId)) return false;
    }

    if (filters.noOwnersOnly && owners.length > 0) {
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

    if (filters.unplayedOnly && opts.lastPlayedByGameId?.[game.id]) {
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
