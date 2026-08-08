import type { SupabaseClient } from "@supabase/supabase-js";
import { getBggGameDetailsBatch } from "@/lib/bgg";

export type GameLinkRow = {
  id: string;
  title: string;
  bgg_id: number | null;
  bgg_type: string | null;
  base_game_id: string | null;
};

export type RelinkResult = {
  linked: number;
  unresolved: number;
  details: { expansionId: string; expansionTitle: string; baseTitle?: string }[];
};

/** Expansions not nested under a base game in the catalogue. */
export function findOrphanExpansions(games: GameLinkRow[]): GameLinkRow[] {
  const byId = new Set(games.map((g) => g.id));

  return games.filter((game) => {
    const baseId = game.base_game_id;
    if (baseId && byId.has(baseId)) return false;
    return game.bgg_type === "boardgameexpansion" || !!baseId;
  });
}

const BGG_BATCH_SIZE = 20;

/**
 * Resolve orphan expansions to base games using BGG parent-game links and
 * matching bgg_id values already in the group catalogue.
 */
export async function relinkOrphanExpansions(
  supabase: SupabaseClient,
  groupId: string
): Promise<RelinkResult> {
  const { data: games } = await supabase
    .from("games")
    .select("id, title, bgg_id, bgg_type, base_game_id")
    .eq("group_id", groupId);

  if (!games?.length) {
    return { linked: 0, unresolved: 0, details: [] };
  }

  const byBggId = new Map<number, { id: string; title: string }>();
  for (const game of games) {
    if (game.bgg_id != null && !byBggId.has(game.bgg_id)) {
      byBggId.set(game.bgg_id, { id: game.id, title: game.title });
    }
  }

  const orphans = findOrphanExpansions(games);
  const withBgg = orphans.filter((o) => o.bgg_id != null);

  let linked = 0;
  const details: RelinkResult["details"] = [];

  for (let i = 0; i < withBgg.length; i += BGG_BATCH_SIZE) {
    const chunk = withBgg.slice(i, i + BGG_BATCH_SIZE);
    const detailsByBggId = await getBggGameDetailsBatch(
      chunk.map((o) => o.bgg_id!)
    );

    for (const orphan of chunk) {
      const bggDetails = detailsByBggId.get(orphan.bgg_id!);
      const baseBggId = bggDetails?.baseGameBggId;
      if (!baseBggId) continue;

      const baseGame = byBggId.get(baseBggId);
      if (!baseGame || baseGame.id === orphan.id) continue;

      const { error } = await supabase
        .from("games")
        .update({
          base_game_id: baseGame.id,
          bgg_type: "boardgameexpansion",
        })
        .eq("id", orphan.id)
        .eq("group_id", groupId);

      if (error) continue;

      linked++;
      details.push({
        expansionId: orphan.id,
        expansionTitle: orphan.title,
        baseTitle: baseGame.title,
      });
    }
  }

  return {
    linked,
    unresolved: orphans.length - linked,
    details,
  };
}

/** Link waiting expansions when a base game (by BGG id) is added to the catalogue. */
export async function linkExpansionsToBaseByBggId(
  supabase: SupabaseClient,
  groupId: string,
  baseBggId: number,
  baseGameId: string
): Promise<number> {
  const { data: candidates } = await supabase
    .from("games")
    .select("id, title, bgg_id, base_game_id, bgg_type")
    .eq("group_id", groupId)
    .not("bgg_id", "is", null)
    .neq("id", baseGameId);

  if (!candidates?.length) return 0;

  const orphans = findOrphanExpansions(candidates);
  const toCheck = orphans.filter((o) => o.bgg_id != null);
  if (toCheck.length === 0) return 0;

  const detailsByBggId = await getBggGameDetailsBatch(
    toCheck.map((o) => o.bgg_id!)
  );

  let linked = 0;
  for (const orphan of toCheck) {
    const bggDetails = detailsByBggId.get(orphan.bgg_id!);
    if (bggDetails?.baseGameBggId !== baseBggId) continue;

    const { error } = await supabase
      .from("games")
      .update({
        base_game_id: baseGameId,
        bgg_type: "boardgameexpansion",
      })
      .eq("id", orphan.id)
      .eq("group_id", groupId);

    if (!error) linked++;
  }

  return linked;
}
