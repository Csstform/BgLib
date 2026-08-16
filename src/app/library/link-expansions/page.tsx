import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { groupLibraryGames } from "@/lib/game-expansions";
import { LinkExpansionsPageClient } from "./LinkExpansionsPageClient";
import type { GameWithOwners } from "@/lib/types";

export default async function LinkExpansionsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: games } = await supabase
    .from("games")
    .select(
      `
      *,
      ownership (
        condition,
        notes,
        acquired_date,
        profiles (id, display_name, avatar_url)
      )
    `
    )
    .eq("group_id", groupId)
    .order("title");

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
          avatar_url: string | null;
        };
      }) => ({
        user_id: o.profiles.id,
        display_name: o.profiles.display_name,
        avatar_url: o.profiles.avatar_url,
        condition: o.condition,
        notes: o.notes,
        acquired_date: o.acquired_date,
      })
    ),
  }));

  const grouped = groupLibraryGames(gamesWithOwners);
  const baseGames = gamesWithOwners.filter(
    (g) => g.bgg_type !== "boardgameexpansion" && !g.base_game_id
  );

  return (
    <Suspense fallback={<div className="page-shell p-6 text-sm text-muted">Loading...</div>}>
      <LinkExpansionsPageClient
        orphans={grouped.orphanExpansions}
        baseGames={baseGames}
      />
    </Suspense>
  );
}
