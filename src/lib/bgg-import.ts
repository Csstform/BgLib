import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBggGameDetailsBatch,
  type BggCollectionItem,
  type BggGameDetails,
} from "@/lib/bgg";
import { normalizeTitle } from "@/lib/duplicate-detection";
import { resolveBaseGameId } from "@/lib/resolve-base-game";

export type ExistingGameIndex = {
  byBggId: Map<number, { id: string; title: string }>;
  byTitle: Map<string, { id: string; title: string; bgg_id: number | null }>;
};

export type SkipReason = "bgg_id" | "title";

export type ClassifiedItem = {
  id: number;
  name: string;
  subtype: BggCollectionItem["subtype"];
  action: "import" | "skip";
  reason?: SkipReason;
  existingGameId?: string;
};

export async function loadExistingGameIndex(
  supabase: SupabaseClient,
  groupId: string
): Promise<ExistingGameIndex> {
  const { data } = await supabase
    .from("games")
    .select("id, title, bgg_id")
    .eq("group_id", groupId);

  const byBggId = new Map<number, { id: string; title: string }>();
  const byTitle = new Map<
    string,
    { id: string; title: string; bgg_id: number | null }
  >();

  for (const game of data ?? []) {
    if (game.bgg_id != null) {
      byBggId.set(game.bgg_id, { id: game.id, title: game.title });
    }
    const key = normalizeTitle(game.title);
    if (key.length >= 3 && !byTitle.has(key)) {
      byTitle.set(key, game);
    }
  }

  return { byBggId, byTitle };
}

export function classifyCollectionItem(
  item: BggCollectionItem,
  index: ExistingGameIndex
): ClassifiedItem {
  const byBgg = index.byBggId.get(item.id);
  if (byBgg) {
    return {
      id: item.id,
      name: item.name,
      subtype: item.subtype,
      action: "skip",
      reason: "bgg_id",
      existingGameId: byBgg.id,
    };
  }

  const titleKey = normalizeTitle(item.name);
  if (titleKey.length >= 3) {
    const byTitle = index.byTitle.get(titleKey);
    if (byTitle) {
      return {
        id: item.id,
        name: item.name,
        subtype: item.subtype,
        action: "skip",
        reason: "title",
        existingGameId: byTitle.id,
      };
    }
  }

  return {
    id: item.id,
    name: item.name,
    subtype: item.subtype,
    action: "import",
  };
}

export function classifyCollection(
  collection: BggCollectionItem[],
  index: ExistingGameIndex
): ClassifiedItem[] {
  const sorted = [...collection].sort((a, b) => {
    if (a.subtype === b.subtype) return a.name.localeCompare(b.name);
    return a.subtype === "boardgame" ? -1 : 1;
  });

  return sorted.map((item) => classifyCollectionItem(item, index));
}

function registerImportedGame(
  index: ExistingGameIndex,
  game: { id: string; title: string; bgg_id: number | null }
) {
  if (game.bgg_id != null) {
    index.byBggId.set(game.bgg_id, { id: game.id, title: game.title });
  }
  const titleKey = normalizeTitle(game.title);
  if (titleKey.length >= 3 && !index.byTitle.has(titleKey)) {
    index.byTitle.set(titleKey, game);
  }
}

async function linkOwnership(
  supabase: SupabaseClient,
  userId: string,
  gameId: string
) {
  await supabase
    .from("ownership")
    .upsert({ user_id: userId, game_id: gameId }, { onConflict: "user_id,game_id" });
}

async function backfillBggId(
  supabase: SupabaseClient,
  gameId: string,
  bggId: number,
  bggType: BggGameDetails["bggType"]
) {
  await supabase
    .from("games")
    .update({ bgg_id: bggId, bgg_type: bggType })
    .eq("id", gameId)
    .is("bgg_id", null);
}

export async function linkSkippedDuplicates({
  supabase,
  userId,
  items,
  index,
}: {
  supabase: SupabaseClient;
  userId: string;
  items: ClassifiedItem[];
  index: ExistingGameIndex;
}): Promise<number> {
  let linked = 0;

  for (const item of items) {
    if (item.action !== "skip" || !item.existingGameId) continue;

    await linkOwnership(supabase, userId, item.existingGameId);

    if (item.reason === "title") {
      const existing = index.byTitle.get(normalizeTitle(item.name));
      if (existing && existing.bgg_id == null) {
        await backfillBggId(
          supabase,
          item.existingGameId,
          item.id,
          item.subtype
        );
        existing.bgg_id = item.id;
      }
      index.byBggId.set(item.id, {
        id: item.existingGameId,
        title: existing?.title ?? item.name,
      });
    }

    linked++;
  }

  return linked;
}

export type ImportBatchResult = {
  imported: number;
  linked: number;
  skipped: number;
  failed: number;
};

export async function importBggBatch({
  supabase,
  groupId,
  userId,
  bggIds,
  index,
}: {
  supabase: SupabaseClient;
  groupId: string;
  userId: string;
  bggIds: number[];
  index: ExistingGameIndex;
}): Promise<ImportBatchResult> {
  const result: ImportBatchResult = {
    imported: 0,
    linked: 0,
    skipped: 0,
    failed: 0,
  };

  if (bggIds.length === 0) return result;

  const detailsById = await getBggGameDetailsBatch(bggIds);

  for (const bggId of bggIds) {
    const existingByBgg = index.byBggId.get(bggId);
    if (existingByBgg) {
      await linkOwnership(supabase, userId, existingByBgg.id);
      result.linked++;
      continue;
    }

    const details = detailsById.get(bggId);
    if (!details) {
      result.failed++;
      continue;
    }

    const titleKey = normalizeTitle(details.name);
    if (titleKey.length >= 3) {
      const existingByTitle = index.byTitle.get(titleKey);
      if (existingByTitle) {
        await linkOwnership(supabase, userId, existingByTitle.id);
        if (existingByTitle.bgg_id == null) {
          await backfillBggId(
            supabase,
            existingByTitle.id,
            details.id,
            details.bggType
          );
          existingByTitle.bgg_id = details.id;
        }
        index.byBggId.set(bggId, {
          id: existingByTitle.id,
          title: existingByTitle.title,
        });
        result.linked++;
        continue;
      }
    }

    try {
      const baseGameId = await resolveBaseGameId(
        supabase,
        groupId,
        details.baseGameBggId
      );

      const { data: game, error } = await supabase
        .from("games")
        .insert({
          title: details.name,
          description: details.description || null,
          min_players: details.minPlayers,
          max_players: details.maxPlayers,
          play_time_minutes: details.playTimeMinutes,
          image_url: details.imageUrl,
          bgg_id: details.id,
          bgg_type: details.bggType,
          base_game_id: baseGameId,
          group_id: groupId,
          created_by: userId,
        })
        .select("id, title, bgg_id")
        .single();

      if (error || !game) {
        result.failed++;
        continue;
      }

      await linkOwnership(supabase, userId, game.id);
      registerImportedGame(index, game);
      result.imported++;
    } catch {
      result.failed++;
    }
  }

  return result;
}
