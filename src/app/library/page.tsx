import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { LibraryClient } from "./LibraryClient";
import { groupLibraryGames } from "@/lib/game-expansions";
import type { GameWithOwners } from "@/lib/types";

export default async function LibraryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();
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

  return (
    <div className="px-4 py-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Library</h1>
          <p className="text-sm text-muted mt-0.5">
            {grouped.bases.length} base game
            {grouped.bases.length !== 1 ? "s" : ""}
            {gamesWithOwners.length !== grouped.bases.length
              ? ` · ${gamesWithOwners.length} total entries`
              : ""}
          </p>
        </div>
        <Link
          href="/add-game"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </div>
      <LibraryClient games={gamesWithOwners} />
    </div>
  );
}
