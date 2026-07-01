import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve a local game id from a BGG base-game id within a group. */
export async function resolveBaseGameId(
  supabase: SupabaseClient,
  groupId: string,
  baseGameBggId: number | null | undefined
): Promise<string | null> {
  if (!baseGameBggId) return null;

  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", groupId)
    .eq("bgg_id", baseGameBggId)
    .maybeSingle();

  return data?.id ?? null;
}
