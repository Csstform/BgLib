import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyGroupMembers } from "@/lib/push";
import { formatDateTime, parseClientIsoDateTime } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { profileName } from "@/lib/profile-name";
import { sendGameNightInviteToGroup } from "@/lib/send-game-night-invite";

async function loadGameTitles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  gameIds: string[]
): Promise<string[]> {
  if (gameIds.length === 0) return [];
  const { data } = await supabase
    .from("games")
    .select("title")
    .eq("group_id", groupId)
    .in("id", gameIds);
  return (data ?? []).map((g) => g.title).filter(Boolean);
}

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
  const { title, description, scheduled_at, location, game_ids, send_email } = body;

  if (!title?.trim() || !scheduled_at) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    );
  }

  const scheduledDate = parseClientIsoDateTime(scheduled_at);
  if (!scheduledDate) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const scheduledAtIso = scheduledDate.toISOString();

  const { data: gameNight, error } = await supabase
    .from("game_nights")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduledAtIso,
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
    .select("display_name, real_name")
    .eq("id", user.id)
    .single();

  const hostName = profileName(host);
  const gameTitles = await loadGameTitles(
    supabase,
    groupId,
    Array.isArray(game_ids) ? game_ids : []
  );

  await notifyGroupMembers(
    groupId,
    user.id,
    {
      title: "New game night planned!",
      body: `${hostName} is hosting "${title.trim()}" on ${formatDateTime(scheduledAtIso)}`,
      url: `/game-nights/${gameNight.id}`,
    },
    { email: false }
  );

  if (send_email !== false) {
    await sendGameNightInviteToGroup({
      groupId,
      excludeUserId: user.id,
      night: {
        id: gameNight.id,
        title: title.trim(),
        scheduled_at: scheduledAtIso,
        location: location?.trim() || null,
        description: description?.trim() || null,
        host_name: hostName,
        game_titles: gameTitles,
      },
    });
  }

  return NextResponse.json(gameNight);
}
