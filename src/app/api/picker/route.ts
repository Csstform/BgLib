import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { comparePickerGames, computePickerScore } from "@/lib/picker-scoring";
import type { OwnedExpansion } from "@/lib/types";

export async function GET(request: NextRequest) {
  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const playerCount = parseInt(
    request.nextUrl.searchParams.get("players") ?? "2",
    10
  );
  const maxTime = request.nextUrl.searchParams.get("max_time");
  const attendeeIds =
    request.nextUrl.searchParams.get("attendees")?.split(",").filter(Boolean) ??
    [];
  const wantToPlayOnly =
    request.nextUrl.searchParams.get("want_to_play") === "1";
  const randomPick = request.nextUrl.searchParams.get("random") === "1";

  const supabase = await createClient();

  const [{ data: games }, { data: plays }, { data: wants }] = await Promise.all([
    supabase
      .from("games")
      .select(
        `
      *,
      ownership (
        user_id,
        profiles (id, display_name, avatar_url)
      )
    `
      )
      .eq("group_id", groupId),
    supabase
      .from("plays")
      .select("game_id, played_at")
      .eq("group_id", groupId)
      .order("played_at", { ascending: false }),
    supabase.from("want_to_play").select("game_id, user_id").eq("group_id", groupId),
  ]);

  const lastPlayed = new Map<string, string>();
  const playCount = new Map<string, number>();
  (plays ?? []).forEach((p) => {
    playCount.set(p.game_id, (playCount.get(p.game_id) ?? 0) + 1);
    if (!lastPlayed.has(p.game_id)) lastPlayed.set(p.game_id, p.played_at);
  });

  const wantByGame = new Map<string, Set<string>>();
  (wants ?? []).forEach((w) => {
    const set = wantByGame.get(w.game_id) ?? new Set<string>();
    set.add(w.user_id);
    wantByGame.set(w.game_id, set);
  });

  const maxTimeMin = maxTime ? parseInt(maxTime, 10) : null;
  const allGames = games ?? [];

  const expansionsByBase = new Map<
    string,
    (OwnedExpansion & { owner_ids: string[] })[]
  >();
  for (const g of allGames) {
    if (!g.base_game_id) continue;

    const ownerRows = (g.ownership ?? []) as {
      user_id: string;
      profiles: { display_name: string } | { display_name: string }[];
    }[];

    if (ownerRows.length === 0) continue;

    const ownerNames = ownerRows
      .map((o) => {
        const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        return profile?.display_name;
      })
      .filter(Boolean) as string[];

    const ownerIds = ownerRows.map((o) => o.user_id);

    const list = expansionsByBase.get(g.base_game_id) ?? [];
    list.push({
      id: g.id,
      title: g.title,
      owner_names: ownerNames,
      owner_ids: ownerIds,
    });
    expansionsByBase.set(g.base_game_id, list);
  }

  const results = allGames
    .filter((g) => !g.base_game_id && g.bgg_type !== "boardgameexpansion")
    .map((g) => {
      const owners = (g.ownership ?? []).map(
        (o: {
          user_id: string;
          profiles: { id: string; display_name: string; avatar_url: string | null };
        }) => ({
          user_id: o.user_id,
          display_name: (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles)
            ?.display_name,
          avatar_url: (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles)
            ?.avatar_url,
        })
      );

      if (owners.length === 0) return null;

      const ownerIds = owners.map((o: { user_id: string }) => o.user_id);
      const hasOwner =
        attendeeIds.length === 0 ||
        attendeeIds.some((id) => ownerIds.includes(id));
      if (!hasOwner) return null;

      const minP = g.min_players ?? 1;
      const maxP = g.max_players ?? 99;
      if (playerCount < minP || playerCount > maxP) return null;

      if (
        maxTimeMin &&
        g.play_time_minutes &&
        g.play_time_minutes > maxTimeMin
      ) {
        return null;
      }

      const gameWantUsers = wantByGame.get(g.id) ?? new Set<string>();
      const attendeeWantCount =
        attendeeIds.length === 0
          ? gameWantUsers.size
          : attendeeIds.filter((id) => gameWantUsers.has(id)).length;

      if (wantToPlayOnly && attendeeWantCount === 0) {
        return null;
      }

      const matchingOwners =
        attendeeIds.length > 0
          ? owners.filter((o: { user_id: string }) =>
              attendeeIds.includes(o.user_id)
            )
          : owners;

      const ownedExpansions = (expansionsByBase.get(g.id) ?? [])
        .filter((exp) => {
          if (attendeeIds.length === 0) return true;
          return exp.owner_ids.some((id) => attendeeIds.includes(id));
        })
        .map(({ id, title, owner_names }) => ({ id, title, owner_names }))
        .sort((a, b) => a.title.localeCompare(b.title));

      const count = playCount.get(g.id) ?? 0;
      const lastPlayedAt = lastPlayed.get(g.id) ?? null;

      return {
        ...g,
        owners: matchingOwners.map(
          (o: {
            user_id: string;
            display_name: string;
            avatar_url: string | null;
          }) => ({
            user_id: o.user_id,
            display_name: o.display_name,
            avatar_url: o.avatar_url,
            condition: "good",
            notes: null,
            acquired_date: null,
          })
        ),
        last_played_at: lastPlayedAt,
        play_count: count,
        never_played: count === 0,
        want_count: attendeeWantCount,
        picker_score: computePickerScore({
          lastPlayedAt,
          playCount: count,
          wantCount: attendeeWantCount,
        }),
        owner_names: matchingOwners.map(
          (o: { display_name: string }) => o.display_name
        ),
        owned_expansions: ownedExpansions,
      };
    })
    .filter(Boolean)
    .sort(comparePickerGames);

  let output = results;

  if (randomPick && output.length > 0) {
    const topPool = output.slice(0, Math.min(5, output.length));
    const pick = topPool[Math.floor(Math.random() * topPool.length)];
    output = pick ? [pick] : output;
  }

  return NextResponse.json({ games: output });
}
