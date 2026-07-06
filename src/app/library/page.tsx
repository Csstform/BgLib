import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { LibraryClient } from "./LibraryClient";
import { groupLibraryGames } from "@/lib/game-expansions";
import type { GameWithOwners } from "@/lib/types";

export default async function LibraryPage() {
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
          profiles (id, display_name, avatar_url)
        )
      `
      )
      .eq("group_id", groupId)
      .order("title"),
    supabase
      .from("plays")
      .select("game_id, played_at")
      .eq("group_id", groupId)
      .order("played_at", { ascending: false }),
  ]);

  const lastPlayedByGameId: Record<string, string> = {};
  for (const play of plays ?? []) {
    if (!lastPlayedByGameId[play.game_id]) {
      lastPlayedByGameId[play.game_id] = play.played_at;
    }
  }

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

  return (
    <div className="page-shell">
      <PageHeader
        title="Game Library"
        subtitle={`${grouped.bases.length} base game${grouped.bases.length !== 1 ? "s" : ""}${
          gamesWithOwners.length !== grouped.bases.length
            ? ` · ${gamesWithOwners.length} total entries`
            : ""
        }`}
        action={
          <Link
            href="/add-game"
            className="btn-primary pressable flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Add
          </Link>
        }
      />
      <LibraryClient
        groupId={groupId}
        games={gamesWithOwners}
        lastPlayedByGameId={lastPlayedByGameId}
        userId={user?.id}
      />
    </div>
  );
}
