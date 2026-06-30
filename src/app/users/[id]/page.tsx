import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getInitials } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameCard } from "@/components/GameCard";
import type { GameWithOwners } from "@/lib/types";

export default async function UserProfilePage({
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

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: groupGames } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", groupId);

  const gameIds = (groupGames ?? []).map((g) => g.id);

  const { data: ownerships } = await supabase
    .from("ownership")
    .select(
      `
      game_id,
      games (
        id, title, description, min_players, max_players,
        play_time_minutes, image_url, bgg_id, created_by, created_at
      )
    `
    )
    .eq("user_id", id)
    .in("game_id", gameIds.length > 0 ? gameIds : ["00000000-0000-0000-0000-000000000000"]);

  const games: GameWithOwners[] = (ownerships ?? [])
    .map((o) => {
      const game = Array.isArray(o.games) ? o.games[0] : o.games;
      if (!game) return null;
      return { ...game, owners: [] } as GameWithOwners;
    })
    .filter((g): g is GameWithOwners => g !== null);

  return (
    <div className="px-4 py-6 pb-24">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        All players
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-medium text-primary overflow-hidden shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(profile.display_name)
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          {profile.bio && (
            <p className="text-sm text-muted mt-0.5">{profile.bio}</p>
          )}
          <p className="text-sm text-muted mt-1">
            {games.length} game{games.length !== 1 ? "s" : ""} in this group
          </p>
        </div>
      </div>

      {games.length === 0 ? (
        <p className="text-center text-muted py-8">
          No games in this group&apos;s collection yet.
        </p>
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
