import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { game_night_id, game_ids } = body;

  if (!game_night_id || !game_ids?.length) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: night } = await supabase
    .from("game_nights")
    .select("host_id, group_id, title")
    .eq("id", game_night_id)
    .single();

  if (!night || night.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase
    .from("game_night_games")
    .delete()
    .eq("game_night_id", game_night_id);

  await supabase.from("game_night_games").insert(
    game_ids.map((game_id: string) => ({
      game_night_id,
      game_id,
    }))
  );

  return NextResponse.json({ ok: true });
}
