import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { LogPlayForm } from "../../LogPlayForm";

async function loadExpansionsByBase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  games: { id: string; title: string; base_game_id: string | null; bgg_type?: string | null }[]
) {
  const expansionsByBase: Record<
    string,
    { id: string; title: string; owner_names: string[] }[]
  > = {};

  const expansionGames = games.filter(
    (g) => g.base_game_id || g.bgg_type === "boardgameexpansion"
  );

  if (expansionGames.length === 0) return expansionsByBase;

  const expansionIds = expansionGames.map((g) => g.id);
  const { data: ownership } = await supabase
    .from("ownership")
    .select("game_id, profiles (display_name)")
    .in("game_id", expansionIds);

  const ownersByGame = new Map<string, string[]>();
  for (const row of ownership ?? []) {
    const names = ownersByGame.get(row.game_id) ?? [];
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    if (profile?.display_name) names.push(profile.display_name);
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

  return expansionsByBase;
}

export default async function EditPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const { data: play } = await supabase
    .from("plays")
    .select(
      `
      id, game_id, played_at, duration_minutes, notes, logged_by, first_time_played,
      play_participants (user_id, is_winner, score),
      play_expansions (game_id)
    `
    )
    .eq("id", id)
    .eq("group_id", groupId)
    .single();

  if (!play) notFound();
  if (play.logged_by !== user.id) redirect("/plays");

  const { data: games } = await supabase
    .from("games")
    .select(
      "id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, bgg_type, base_game_id, created_by, created_at"
    )
    .eq("group_id", groupId)
    .order("title");

  const expansionsByBase = await loadExpansionsByBase(
    supabase,
    groupId,
    games ?? []
  );

  const members = await getGroupMembers(groupId);

  const participants = (play.play_participants ?? []).map(
    (p: { user_id: string }) => p.user_id
  );
  const winners = (play.play_participants ?? [])
    .filter((p: { is_winner: boolean }) => p.is_winner)
    .map((p: { user_id: string }) => p.user_id);
  const scores: Record<string, string> = {};
  for (const p of play.play_participants ?? []) {
    if (p.score != null) scores[p.user_id] = String(p.score);
  }
  const expansionIds = (play.play_expansions ?? []).map(
    (pe: { game_id: string }) => pe.game_id
  );

  const playedAtLocal = new Date(play.played_at);
  const offset = playedAtLocal.getTimezoneOffset() * 60000;
  const localIso = new Date(playedAtLocal.getTime() - offset)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-bold">Edit Play</h1>
      <LogPlayForm
        groupId={groupId}
        games={games ?? []}
        expansionsByBase={expansionsByBase}
        members={members}
        userId={user.id}
        playId={play.id}
        preselectedGameId={play.game_id}
        initialPlayedAt={localIso}
        initialDuration={
          play.duration_minutes != null ? String(play.duration_minutes) : ""
        }
        initialNotes={play.notes ?? ""}
        initialParticipants={participants.length > 0 ? participants : [user.id]}
        initialWinners={winners}
        initialScores={scores}
        initialExpansionIds={expansionIds}
        initialFirstTimePlayed={!!play.first_time_played}
      />
    </div>
  );
}
