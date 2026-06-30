import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyGroupMembers } from "@/lib/push";
import { formatDateTime } from "@/lib/utils";
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

  const body = await request.json();
  const { title, description, scheduled_at, location, game_ids } = body;

  if (!title?.trim() || !scheduled_at) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
  }

  const { data: gameNight, error } = await supabase
    .from("game_nights")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at,
      location: location?.trim() || null,
      host_id: user.id,
      group_id: groupId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (game_ids?.length) {
    await supabase.from("game_night_games").insert(
      game_ids.map((game_id: string) => ({
        game_night_id: gameNight.id,
        game_id,
      }))
    );
  }

  await supabase.from("game_night_rsvps").upsert({
    game_night_id: gameNight.id,
    user_id: user.id,
    status: "going",
  });

  const { data: host } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  await notifyGroupMembers(groupId, user.id, {
    title: "New game night planned!",
    body: `${host?.display_name ?? "Someone"} is hosting "${title}" on ${formatDateTime(scheduled_at)}`,
    url: `/game-nights/${gameNight.id}`,
  });

  return NextResponse.json(gameNight);
}
