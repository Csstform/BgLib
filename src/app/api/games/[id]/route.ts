import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getActiveGroupId();
  const body = await request.json();

  const { data: game } = await supabase
    .from("games")
    .select("group_id")
    .eq("id", id)
    .single();

  if (!game || game.group_id !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined)
    updates.description = body.description?.trim() || null;
  if (body.min_players !== undefined) updates.min_players = body.min_players;
  if (body.max_players !== undefined) updates.max_players = body.max_players;
  if (body.play_time_minutes !== undefined)
    updates.play_time_minutes = body.play_time_minutes;
  if (body.image_url !== undefined)
    updates.image_url = body.image_url?.trim() || null;

  if (body.base_game_id !== undefined) {
    const baseGameId = body.base_game_id as string | null;
    if (baseGameId === null) {
      updates.base_game_id = null;
    } else {
      const { data: baseGame } = await supabase
        .from("games")
        .select("id, bgg_type, base_game_id")
        .eq("id", baseGameId)
        .eq("group_id", groupId)
        .single();

      if (
        !baseGame ||
        baseGame.bgg_type === "boardgameexpansion" ||
        baseGame.base_game_id
      ) {
        return NextResponse.json(
          { error: "Select a base game, not another expansion" },
          { status: 400 }
        );
      }

      if (baseGameId === id) {
        return NextResponse.json(
          { error: "An expansion cannot link to itself" },
          { status: 400 }
        );
      }

      updates.base_game_id = baseGameId;
      updates.bgg_type = "boardgameexpansion";
    }
  }

  const { error } = await supabase.from("games").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: game } = await supabase
    .from("games")
    .select("id, title, group_id")
    .eq("id", id)
    .single();

  if (!game || game.group_id !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("games").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, title: game.title });
}
