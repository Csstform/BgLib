import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured, toDatetimeLocalValue } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { LogPlayForm } from "../LogPlayForm";
import { profileName } from "@/lib/profile-name";

export default async function NewPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; night?: string }>;
}) {
  const { game: gameId, night: nightId } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const { data: games } = await supabase
    .from("games")
    .select(
      "id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, bgg_type, base_game_id, created_by, created_at"
    )
    .eq("group_id", groupId)
    .order("title");

  const expansionsByBase: Record<
    string,
    { id: string; title: string; owner_names: string[] }[]
  > = {};

  const expansionGames = (games ?? []).filter(
    (g) => g.base_game_id || g.bgg_type === "boardgameexpansion"
  );

  if (expansionGames.length > 0) {
    const expansionIds = expansionGames.map((g) => g.id);
    const { data: ownership } = await supabase
      .from("ownership")
      .select("game_id, profiles (display_name, real_name)")
      .in("game_id", expansionIds);

    const ownersByGame = new Map<string, string[]>();
    for (const row of ownership ?? []) {
      const names = ownersByGame.get(row.game_id) ?? [];
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      const name = profileName(profile, "");
      if (name) names.push(name);
      ownersByGame.set(row.game_id, names);
    }

    for (const exp of expansionGames) {
      if (!exp.base_game_id) continue;
      const list = expansionsByBase[exp.base_game_id] ?? [];
      list.push({
        id: exp.id,
        title: exp.title,
        owner_names: ownersByGame.get(exp.id) ?? [],
      });
      expansionsByBase[exp.base_game_id] = list;
    }

    for (const key of Object.keys(expansionsByBase)) {
      expansionsByBase[key].sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  const members = await getGroupMembers(groupId);

  let preselectedGameId = gameId;
  let preselectedExpansionId: string | undefined;
  if (gameId) {
    const selected = (games ?? []).find((g) => g.id === gameId);
    if (selected?.base_game_id) {
      preselectedGameId = selected.base_game_id;
      preselectedExpansionId = selected.id;
    }
  }

  let sourceNightTitle: string | undefined;
  let initialPlayedAt: string | undefined;
  let initialParticipants: string[] | undefined;

  if (nightId) {
    const { data: night } = await supabase
      .from("game_nights")
      .select(
        `
        id, title, scheduled_at, group_id,
        rsvps:game_night_rsvps (user_id, status),
        game_night_games (game_id)
      `
      )
      .eq("id", nightId)
      .maybeSingle();

    if (night && night.group_id === groupId) {
      sourceNightTitle = night.title;
      initialPlayedAt = toDatetimeLocalValue(night.scheduled_at);

      const goingIds = (night.rsvps ?? [])
        .filter((r: { status: string }) => r.status === "going")
        .map((r: { user_id: string }) => r.user_id);
      initialParticipants = goingIds.includes(user.id)
        ? goingIds
        : goingIds.length > 0
          ? [...goingIds, user.id]
          : [user.id];

      if (!gameId) {
        const planned = (night.game_night_games ?? []).map(
          (g: { game_id: string }) => g.game_id
        );
        if (planned.length === 1) {
          const selected = (games ?? []).find((g) => g.id === planned[0]);
          if (selected?.base_game_id) {
            preselectedGameId = selected.base_game_id;
            preselectedExpansionId = selected.id;
          } else {
            preselectedGameId = planned[0];
          }
        }
      }
    }
  }

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-bold">Log a Play</h1>
      <LogPlayForm
        groupId={groupId}
        games={games ?? []}
        expansionsByBase={expansionsByBase}
        members={members}
        userId={user.id}
        preselectedGameId={preselectedGameId}
        preselectedExpansionId={preselectedExpansionId}
        sourceNightTitle={sourceNightTitle}
        initialPlayedAt={initialPlayedAt}
        initialParticipants={initialParticipants}
      />
    </div>
  );
}
