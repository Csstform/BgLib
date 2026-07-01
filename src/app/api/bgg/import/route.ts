import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { getBggCollection, getBggGameDetails } from "@/lib/bgg";
import { resolveBaseGameId } from "@/lib/resolve-base-game";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const { username } = await request.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  let collection;
  try {
    collection = await getBggCollection(username.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : "BGG collection fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (collection.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, total: 0 });
  }

  const { data: existing } = await supabase
    .from("games")
    .select("bgg_id")
    .eq("group_id", groupId)
    .not("bgg_id", "is", null);

  const existingBggIds = new Set((existing ?? []).map((g) => g.bgg_id));

  let imported = 0;
  let skipped = 0;

  const sorted = [...collection.slice(0, 100)].sort((a, b) => {
    if (a.subtype === b.subtype) return 0;
    return a.subtype === "boardgame" ? -1 : 1;
  });

  for (const item of sorted) {
    if (existingBggIds.has(item.id)) {
      skipped++;
      continue;
    }

    try {
      const details = await getBggGameDetails(item.id);
      if (!details) {
        skipped++;
        continue;
      }

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
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !game) {
        skipped++;
        continue;
      }

      await supabase.from("ownership").upsert(
        { user_id: user.id, game_id: game.id },
        { onConflict: "user_id,game_id" }
      );

      existingBggIds.add(item.id);
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    total: collection.length,
    truncated: collection.length > 100,
  });
}
