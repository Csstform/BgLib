import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import type { GameWithOwners } from "@/lib/types";
import { profileName } from "@/lib/profile-name";
import { summarizePlayDates } from "@/lib/play-dates";

export async function GET() {
  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const supabase = await createClient();

  const [{ data: games }, { data: plays }] = await Promise.all([
    supabase
      .from("games")
      .select(
        `
        *,
        ownership (
          condition,
          notes,
          acquired_date,
          profiles (id, display_name, real_name, avatar_url)
        )
      `
      )
      .eq("group_id", groupId)
      .order("title"),
    supabase
      .from("plays")
      .select("game_id, played_at, undated")
      .eq("group_id", groupId)
      .order("played_at", { ascending: false }),
  ]);

  const { lastPlayedByGameId, playedGameIds } = summarizePlayDates(plays ?? []);

  const gamesWithOwners: GameWithOwners[] = (games ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    min_players: g.min_players,
    max_players: g.max_players,
    play_time_minutes: g.play_time_minutes,
    image_url: g.image_url,
    bgg_id: g.bgg_id,
    bgg_type: g.bgg_type,
    base_game_id: g.base_game_id,
    upc: g.upc,
    created_by: g.created_by,
    created_at: g.created_at,
    owners: (g.ownership ?? []).map(
      (o: {
        condition: string;
        notes: string | null;
        acquired_date: string | null;
        profiles: {
          id: string;
          display_name: string;
          real_name?: string | null;
          avatar_url: string | null;
        };
      }) => ({
        user_id: o.profiles.id,
        display_name: profileName(o.profiles),
        avatar_url: o.profiles.avatar_url,
        condition: o.condition,
        notes: o.notes,
        acquired_date: o.acquired_date,
      })
    ),
  }));

  return NextResponse.json(
    { groupId, games: gamesWithOwners, lastPlayedByGameId, playedGameIds },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
