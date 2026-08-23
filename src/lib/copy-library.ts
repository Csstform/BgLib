import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTitle } from "@/lib/duplicate-detection";

export type CopyLibraryMode = "my_collection" | "full_catalogue";
export type CopyMatchReason = "bgg_id" | "upc" | "title";

export type CopyableGame = {
  id: string;
  title: string;
  description: string | null;
  min_players: number;
  max_players: number | null;
  play_time_minutes: number | null;
  image_url: string | null;
  bgg_id: number | null;
  bgg_type: "boardgame" | "boardgameexpansion" | null;
  base_game_id: string | null;
  upc: string | null;
  ownership: {
    condition: string | null;
    notes: string | null;
    acquired_date: string | null;
  } | null;
  includedAsBase: boolean;
};

export type TargetGameIndex = {
  byBggId: Map<number, IndexedGame>;
  byUpc: Map<string, IndexedGame>;
  byTitle: Map<string, IndexedGame>;
};

type IndexedGame = {
  id: string;
  title: string;
  bgg_id: number | null;
  upc: string | null;
};

export type ClassifiedCopyItem = {
  sourceId: string;
  title: string;
  action: "copy" | "link";
  reason?: CopyMatchReason;
  existingGameId?: string;
  includedAsBase: boolean;
};

type GameQueryRow = {
  id: string;
  title: string;
  description: string | null;
  min_players: number;
  max_players: number | null;
  play_time_minutes: number | null;
  image_url: string | null;
  bgg_id: number | null;
  bgg_type: "boardgame" | "boardgameexpansion" | null;
  base_game_id: string | null;
  upc: string | null;
  ownership?:
    | {
        user_id: string;
        condition: string | null;
        notes: string | null;
        acquired_date: string | null;
      }
    | {
        user_id: string;
        condition: string | null;
        notes: string | null;
        acquired_date: string | null;
      }[];
};

const GAME_COLUMNS = `
  id,
  title,
  description,
  min_players,
  max_players,
  play_time_minutes,
  image_url,
  bgg_id,
  bgg_type,
  base_game_id,
  upc
`;

const GAME_SELECT = `${GAME_COLUMNS}, ownership (user_id, condition, notes, acquired_date)`;
const GAME_SELECT_OWNED = `${GAME_COLUMNS}, ownership!inner (user_id, condition, notes, acquired_date)`;

function asOwnershipRows(value: GameQueryRow["ownership"]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toCopyableGame(
  row: GameQueryRow,
  userId: string,
  includedAsBase = false
): CopyableGame {
  const mine = asOwnershipRows(row.ownership).find((row) => row.user_id === userId);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    min_players: row.min_players,
    max_players: row.max_players,
    play_time_minutes: row.play_time_minutes,
    image_url: row.image_url,
    bgg_id: row.bgg_id,
    bgg_type: row.bgg_type,
    base_game_id: row.base_game_id,
    upc: row.upc,
    ownership: mine
      ? {
          condition: mine.condition,
          notes: mine.notes,
          acquired_date: mine.acquired_date,
        }
      : null,
    includedAsBase,
  };
}

function isExpansion(game: Pick<CopyableGame, "bgg_type" | "base_game_id">) {
  return game.bgg_type === "boardgameexpansion" || !!game.base_game_id;
}

export function sortCopyableGames(games: CopyableGame[]): CopyableGame[] {
  return [...games].sort((a, b) => {
    const aExp = isExpansion(a);
    const bExp = isExpansion(b);
    if (aExp !== bExp) return aExp ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

export async function loadTargetGameIndex(
  supabase: SupabaseClient,
  groupId: string
): Promise<TargetGameIndex> {
  const { data } = await supabase
    .from("games")
    .select("id, title, bgg_id, upc")
    .eq("group_id", groupId);

  const byBggId = new Map<number, IndexedGame>();
  const byUpc = new Map<string, IndexedGame>();
  const byTitle = new Map<string, IndexedGame>();

  for (const game of data ?? []) {
    if (game.bgg_id != null && !byBggId.has(game.bgg_id)) {
      byBggId.set(game.bgg_id, game);
    }
    if (game.upc?.trim() && !byUpc.has(game.upc.trim())) {
      byUpc.set(game.upc.trim(), game);
    }
    const key = normalizeTitle(game.title);
    if (key.length >= 3 && !byTitle.has(key)) {
      byTitle.set(key, game);
    }
  }

  return { byBggId, byUpc, byTitle };
}

export function classifySourceGame(
  game: CopyableGame,
  index: TargetGameIndex
): ClassifiedCopyItem {
  if (game.bgg_id != null) {
    const match = index.byBggId.get(game.bgg_id);
    if (match) {
      return {
        sourceId: game.id,
        title: game.title,
        action: "link",
        reason: "bgg_id",
        existingGameId: match.id,
        includedAsBase: game.includedAsBase,
      };
    }
  }

  if (game.upc?.trim()) {
    const match = index.byUpc.get(game.upc.trim());
    if (match) {
      return {
        sourceId: game.id,
        title: game.title,
        action: "link",
        reason: "upc",
        existingGameId: match.id,
        includedAsBase: game.includedAsBase,
      };
    }
  }

  const titleKey = normalizeTitle(game.title);
  if (titleKey.length >= 3) {
    const match = index.byTitle.get(titleKey);
    if (match) {
      return {
        sourceId: game.id,
        title: game.title,
        action: "link",
        reason: "title",
        existingGameId: match.id,
        includedAsBase: game.includedAsBase,
      };
    }
  }

  return {
    sourceId: game.id,
    title: game.title,
    action: "copy",
    includedAsBase: game.includedAsBase,
  };
}

export function classifyCopyableGames(
  games: CopyableGame[],
  index: TargetGameIndex
): ClassifiedCopyItem[] {
  return sortCopyableGames(games).map((game) => classifySourceGame(game, index));
}

function registerCopiedGame(index: TargetGameIndex, game: IndexedGame) {
  if (game.bgg_id != null && !index.byBggId.has(game.bgg_id)) {
    index.byBggId.set(game.bgg_id, game);
  }
  if (game.upc?.trim() && !index.byUpc.has(game.upc.trim())) {
    index.byUpc.set(game.upc.trim(), game);
  }
  const key = normalizeTitle(game.title);
  if (key.length >= 3 && !index.byTitle.has(key)) {
    index.byTitle.set(key, game);
  }
}

async function ensureOwnership(
  supabase: SupabaseClient,
  userId: string,
  gameId: string,
  ownership: CopyableGame["ownership"]
) {
  const { data: existing } = await supabase
    .from("ownership")
    .select("id")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) return;

  const payload: Record<string, unknown> = {
    user_id: userId,
    game_id: gameId,
  };
  if (ownership?.condition) payload.condition = ownership.condition;
  if (ownership?.notes) payload.notes = ownership.notes;
  if (ownership?.acquired_date) payload.acquired_date = ownership.acquired_date;

  await supabase.from("ownership").insert(payload);
}

async function backfillMissingMetadata(
  supabase: SupabaseClient,
  target: IndexedGame,
  source: CopyableGame
) {
  const updates: Record<string, unknown> = {};
  if (source.bgg_id != null && target.bgg_id == null) {
    updates.bgg_id = source.bgg_id;
    if (source.bgg_type) updates.bgg_type = source.bgg_type;
  }
  if (source.upc?.trim() && !target.upc) {
    updates.upc = source.upc.trim();
  }
  if (Object.keys(updates).length === 0) return;

  await supabase.from("games").update(updates).eq("id", target.id);
  if (typeof updates.bgg_id === "number") target.bgg_id = updates.bgg_id;
  if (typeof updates.upc === "string") target.upc = updates.upc;
}

export async function loadCopyableGames(
  supabase: SupabaseClient,
  sourceGroupId: string,
  userId: string,
  mode: CopyLibraryMode
): Promise<CopyableGame[]> {
  let query = supabase
    .from("games")
    .select(mode === "my_collection" ? GAME_SELECT_OWNED : GAME_SELECT)
    .eq("group_id", sourceGroupId)
    .order("title");

  if (mode === "my_collection") {
    query = query.eq("ownership.user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const games = (data ?? []).map((row) =>
    toCopyableGame(row as GameQueryRow, userId, false)
  );

  if (mode === "full_catalogue") {
    return sortCopyableGames(games);
  }

  const owned = games.filter((game) => game.ownership);
  const ownedIds = new Set(owned.map((game) => game.id));
  const missingBaseIds = [
    ...new Set(
      owned
        .map((game) => game.base_game_id)
        .filter((id): id is string => !!id && !ownedIds.has(id))
    ),
  ];

  if (missingBaseIds.length === 0) {
    return sortCopyableGames(owned);
  }

  const { data: bases } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .eq("group_id", sourceGroupId)
    .in("id", missingBaseIds);

  const extraBases = (bases ?? []).map((row) =>
    toCopyableGame(row as GameQueryRow, userId, true)
  );

  return sortCopyableGames([...owned, ...extraBases]);
}

export type CopyLibraryResult = {
  copied: number;
  linked: number;
  failed: number;
};

export async function copyLibraryToGroup({
  supabase,
  userId,
  targetGroupId,
  games,
}: {
  supabase: SupabaseClient;
  userId: string;
  targetGroupId: string;
  games: CopyableGame[];
}): Promise<CopyLibraryResult> {
  const index = await loadTargetGameIndex(supabase, targetGroupId);
  const idMap = new Map<string, string>();
  const result: CopyLibraryResult = {
    copied: 0,
    linked: 0,
    failed: 0,
  };

  for (const game of sortCopyableGames(games)) {
    const classified = classifySourceGame(game, index);

    try {
      if (classified.action === "link" && classified.existingGameId) {
        const target =
          (game.bgg_id != null ? index.byBggId.get(game.bgg_id) : undefined) ??
          (game.upc?.trim() ? index.byUpc.get(game.upc.trim()) : undefined) ??
          index.byTitle.get(normalizeTitle(game.title));

        if (target) {
          await backfillMissingMetadata(supabase, target, game);
        }

        idMap.set(game.id, classified.existingGameId);
        if (game.ownership && !game.includedAsBase) {
          await ensureOwnership(
            supabase,
            userId,
            classified.existingGameId,
            game.ownership
          );
        }
        result.linked++;
        continue;
      }

      const remappedBaseId = game.base_game_id
        ? (idMap.get(game.base_game_id) ?? null)
        : null;

      const { data: inserted, error } = await supabase
        .from("games")
        .insert({
          title: game.title,
          description: game.description,
          min_players: game.min_players,
          max_players: game.max_players,
          play_time_minutes: game.play_time_minutes,
          image_url: game.image_url,
          bgg_id: game.bgg_id,
          bgg_type: game.bgg_type,
          base_game_id: remappedBaseId,
          upc: game.upc,
          group_id: targetGroupId,
          created_by: userId,
        })
        .select("id, title, bgg_id, upc")
        .single();

      if (error || !inserted) {
        result.failed++;
        continue;
      }

      registerCopiedGame(index, inserted);
      idMap.set(game.id, inserted.id);

      if (game.ownership && !game.includedAsBase) {
        await ensureOwnership(supabase, userId, inserted.id, game.ownership);
      }

      result.copied++;
    } catch {
      result.failed++;
    }
  }

  for (const game of games) {
    if (!game.base_game_id) continue;
    const targetId = idMap.get(game.id);
    const baseTargetId = idMap.get(game.base_game_id);
    if (!targetId || !baseTargetId) continue;

    await supabase
      .from("games")
      .update({ base_game_id: baseTargetId })
      .eq("id", targetId)
      .eq("group_id", targetGroupId);
  }

  return result;
}
