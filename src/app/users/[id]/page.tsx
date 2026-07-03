import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy, Dices, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getInitials } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameCard } from "@/components/GameCard";
import { computePlayerStats } from "@/lib/play-stats";
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
  const emptyGameId = "00000000-0000-0000-0000-000000000000";

  const [{ data: ownerships }, { data: plays }] = await Promise.all([
    supabase
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
      .in("game_id", gameIds.length > 0 ? gameIds : [emptyGameId]),
    supabase
      .from("plays")
      .select("id, game_id, played_at, game:games (id, title)")
      .eq("group_id", groupId),
  ]);

  const playIds = (plays ?? []).map((p) => p.id);

  const { data: participations } = await supabase
    .from("play_participants")
    .select("play_id, is_winner, score")
    .eq("user_id", id)
    .in("play_id", playIds.length > 0 ? playIds : [emptyGameId]);

  const games: GameWithOwners[] = (ownerships ?? [])
    .map((o) => {
      const game = Array.isArray(o.games) ? o.games[0] : o.games;
      if (!game) return null;
      return { ...game, owners: [] } as GameWithOwners;
    })
    .filter((g): g is GameWithOwners => g !== null);

  const playerStats = computePlayerStats(plays ?? [], participations ?? []);

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

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <Dices className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{playerStats.totalPlays}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">
            Plays logged
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <Trophy className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-bold">{playerStats.wins}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">Wins</p>
        </div>
      </div>

      {playerStats.mostPlayedGames.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Dices className="h-4 w-4 text-primary" />
            Most played
          </h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {playerStats.mostPlayedGames.map((g) => (
              <Link
                key={g.game_id}
                href={`/library/${g.game_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
              >
                <span className="font-medium truncate pr-2">{g.title}</span>
                <span className="text-muted shrink-0">
                  {g.play_count} play{g.play_count !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {playerStats.recentPlays.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recent plays
          </h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {playerStats.recentPlays.map((p) => (
              <Link
                key={p.play_id}
                href={`/library/${p.game_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
              >
                <span className="font-medium truncate pr-2">{p.title}</span>
                <span className="text-muted shrink-0 text-xs">
                  {new Date(p.played_at).toLocaleDateString()}
                  {p.is_winner && (
                    <Trophy className="inline h-3 w-3 text-amber-400 ml-1 -mt-0.5" />
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="font-semibold mb-2">Collection</h2>
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
