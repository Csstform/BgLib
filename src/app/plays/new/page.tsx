import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { LogPlayForm } from "../LogPlayForm";

export default async function NewPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameId } = await searchParams;

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
  }

  const members = await getGroupMembers(groupId);

  let preselectedGameId = gameId;
  if (gameId) {
    const selected = (games ?? []).find((g) => g.id === gameId);
    if (selected?.base_game_id) {
      preselectedGameId = selected.base_game_id;
    }
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Log a Play</h1>
      <LogPlayForm
        groupId={groupId}
        games={games ?? []}
        expansionsByBase={expansionsByBase}
        members={members}
        userId={user.id}
        preselectedGameId={preselectedGameId}
      />
    </div>
  );
}
