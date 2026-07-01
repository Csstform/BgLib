import type { Game, GameWithOwners, OwnerInfo } from "@/lib/types";

export type LibraryEntry = GameWithOwners & {
  base_game_id?: string | null;
  bgg_type?: string | null;
  expansions?: GameWithOwners[];
};

export type GroupedLibrary = {
  bases: LibraryEntry[];
  orphanExpansions: GameWithOwners[];
};

/** Group catalogue into base games with nested expansions. */
export function groupLibraryGames(games: GameWithOwners[]): GroupedLibrary {
  const byId = new Map(games.map((g) => [g.id, g]));
  const expansionsByBase = new Map<string, GameWithOwners[]>();

  for (const game of games) {
    const baseId = (game as Game & { base_game_id?: string | null }).base_game_id;
    if (baseId && byId.has(baseId)) {
      const list = expansionsByBase.get(baseId) ?? [];
      list.push(game);
      expansionsByBase.set(baseId, list);
    }
  }

  const bases: LibraryEntry[] = [];
  const orphanExpansions: GameWithOwners[] = [];

  for (const game of games) {
    const baseId = (game as Game & { base_game_id?: string | null }).base_game_id;
    const bggType = (game as Game & { bgg_type?: string | null }).bgg_type;

    if (baseId) {
      if (!byId.has(baseId)) {
        orphanExpansions.push(game);
      }
      continue;
    }

    if (bggType === "boardgameexpansion") {
      orphanExpansions.push(game);
      continue;
    }

    bases.push({
      ...game,
      base_game_id: null,
      bgg_type: bggType ?? "boardgame",
      expansions: (expansionsByBase.get(game.id) ?? []).sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    });
  }

  bases.sort((a, b) => a.title.localeCompare(b.title));
  orphanExpansions.sort((a, b) => a.title.localeCompare(b.title));

  return { bases, orphanExpansions };
}

export function formatExpansionLabel(game: { title: string; base_game_id?: string | null; bgg_type?: string | null }) {
  if (game.bgg_type === "boardgameexpansion" || game.base_game_id) {
    return "Expansion";
  }
  return null;
}

export function ownersLabel(owners: OwnerInfo[]): string {
  if (owners.length === 0) return "No owners";
  return owners.map((o) => o.display_name).join(", ");
}
