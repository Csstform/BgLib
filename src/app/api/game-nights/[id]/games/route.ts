import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameNightId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { game_ids } = body;

  if (!game_ids?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: night } = await supabase
    .from("game_nights")
    .select("host_id, group_id")
    .eq("id", gameNightId)
    .single();

  if (!night || night.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!night.group_id) {
    return NextResponse.json({ error: "Game night has no group" }, { status: 400 });
  }

  const { data: validGames } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", night.group_id)
    .in("id", game_ids);

  const validIds = new Set((validGames ?? []).map((g) => g.id));
  const filtered = (game_ids as string[]).filter((id) => validIds.has(id));

  await supabase.from("game_night_games").delete().eq("game_night_id", gameNightId);

  if (filtered.length > 0) {
    await supabase.from("game_night_games").insert(
      filtered.map((game_id: string) => ({
        game_night_id: gameNightId,
        game_id,
      }))
    );
  }

  return NextResponse.json({ ok: true, count: filtered.length });
}
