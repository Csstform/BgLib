import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { GameNightCalendarInput } from "@/lib/game-night-calendar";
import { profileName } from "@/lib/profile-name";

export async function loadGroupGameNightsForCalendar(
  groupId: string,
  options?: {
    upcomingOnly?: boolean;
    nightId?: string;
    /** Service-role client so unauthenticated calendar subscribers can read events. */
    supabase?: SupabaseClient;
  }
): Promise<GameNightCalendarInput[]> {
  const supabase = options?.supabase ?? (await createClient());
  const upcomingOnly = options?.upcomingOnly ?? true;

  let query = supabase
    .from("game_nights")
    .select(
      `
      id,
      title,
      description,
      location,
      scheduled_at,
      host:profiles!game_nights_host_id_fkey (display_name, real_name),
      game_night_games (
        game:games (title)
      )
    `
    )
    .eq("group_id", groupId)
    .is("cancelled_at", null)
    .order("scheduled_at");

  if (options?.nightId) {
    query = query.eq("id", options.nightId);
  } else if (upcomingOnly) {
    query = query.gte("scheduled_at", new Date().toISOString());
  }

  const { data } = await query;

  return (data ?? []).map((night) => {
    const host = Array.isArray(night.host) ? night.host[0] : night.host;
    const gameTitles = (night.game_night_games ?? [])
      .map((row: { game: { title: string } | { title: string }[] }) => {
        const game = Array.isArray(row.game) ? row.game[0] : row.game;
        return game?.title;
      })
      .filter(Boolean) as string[];

    return {
      id: night.id,
      title: night.title,
      description: night.description,
      location: night.location,
      scheduled_at: night.scheduled_at,
      host_name: profileName(host, ""),
      game_titles: gameTitles,
    };
  });
}

export async function canAccessGroupCalendar(
  groupId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}
