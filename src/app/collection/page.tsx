import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getGroupGameIds } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameCard } from "@/components/GameCard";
import type { GameWithOwners } from "@/lib/types";

export default async function CollectionPage() {
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

  const gameIds = await getGroupGameIds(groupId);

  const { data: ownerships } =
    gameIds.length > 0
      ? await supabase
          .from("ownership")
          .select(
            `
      game_id,
      games (
        id, title, description, min_players, max_players,
        play_time_minutes, image_url, bgg_id, created_by, created_at, group_id
      )
    `
          )
          .eq("user_id", user.id)
          .in("game_id", gameIds)
      : { data: [] };

  const games: GameWithOwners[] = (ownerships ?? [])
    .map((o) => {
      const game = Array.isArray(o.games) ? o.games[0] : o.games;
      if (!game) return null;
      return { ...game, owners: [] } as GameWithOwners;
    })
    .filter((g): g is GameWithOwners => g !== null);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">My Collection</h1>
      <p className="text-sm text-muted mb-6">
        {games.length} game{games.length !== 1 ? "s" : ""} you own in this group
      </p>

      {games.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">Your collection is empty in this group.</p>
          <Link
            href="/library"
            className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
          >
            Browse the library
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
