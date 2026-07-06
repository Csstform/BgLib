import Link from "next/link";
import { redirect } from "next/navigation";
import { Dices } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getGroupGameIds } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameCard } from "@/components/GameCard";
import type { GameWithOwners } from "@/lib/types";

export default async function CollectionPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
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
    <div className="page-shell">
      <PageHeader
        title="My Collection"
        subtitle={`${games.length} game${games.length !== 1 ? "s" : ""} you own in this group`}
      />

      {games.length === 0 ? (
        <EmptyState
          icon={Dices}
          title="Your collection is empty"
          description="Mark games you own from the library, or add new ones."
          action={{ href: "/library", label: "Browse the library" }}
        />
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} hideOwners />
          ))}
        </div>
      )}
    </div>
  );
}
