import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";

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

  const { keep_id, merge_ids } = await request.json();

  if (!keep_id || !merge_ids?.length) {
    return NextResponse.json({ error: "Invalid merge request" }, { status: 400 });
  }

  const allIds = [keep_id, ...merge_ids];

  const { data: games } = await supabase
    .from("games")
    .select("id, group_id")
    .in("id", allIds);

  if (
    !games ||
    games.length !== allIds.length ||
    games.some((g) => g.group_id !== groupId)
  ) {
    return NextResponse.json({ error: "Games not found in group" }, { status: 404 });
  }

  for (const mergeId of merge_ids) {
    const { data: ownerships } = await supabase
      .from("ownership")
      .select("*")
      .eq("game_id", mergeId);

    for (const o of ownerships ?? []) {
      const { data: existing } = await supabase
        .from("ownership")
        .select("id")
        .eq("user_id", o.user_id)
        .eq("game_id", keep_id)
        .single();

      if (!existing) {
        await supabase.from("ownership").insert({
          user_id: o.user_id,
          game_id: keep_id,
          condition: o.condition,
          notes: o.notes,
          acquired_date: o.acquired_date,
        });
      }
    }

    await supabase.from("ownership").delete().eq("game_id", mergeId);
    await supabase.from("game_night_games").delete().eq("game_id", mergeId);
    await supabase.from("loans").update({ game_id: keep_id }).eq("game_id", mergeId);
    await supabase.from("plays").update({ game_id: keep_id }).eq("game_id", mergeId);

    // Merge want-to-play: keep existing entries, drop conflicts
    const { data: wants } = await supabase
      .from("want_to_play")
      .select("user_id, group_id")
      .eq("game_id", mergeId);
    for (const w of wants ?? []) {
      const { data: existing } = await supabase
        .from("want_to_play")
        .select("id")
        .eq("user_id", w.user_id)
        .eq("game_id", keep_id)
        .eq("group_id", w.group_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("want_to_play").delete().eq("game_id", mergeId).eq("user_id", w.user_id);
      } else {
        await supabase
          .from("want_to_play")
          .update({ game_id: keep_id })
          .eq("game_id", mergeId)
          .eq("user_id", w.user_id);
      }
    }

    await supabase.from("games").delete().eq("id", mergeId);
  }

  return NextResponse.json({ ok: true, kept: keep_id });
}
