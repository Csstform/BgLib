import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Trophy, Dices, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";

export default async function StatsPage() {
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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: plays }, { data: participantRows }] = await Promise.all([
    supabase
      .from("plays")
      .select("id, game_id, played_at, game:games (id, title)")
      .eq("group_id", groupId),
    supabase
      .from("play_participants")
      .select(
        `
        is_winner,
        user_id,
        profile:profiles!play_participants_user_id_fkey (id, display_name),
        play_id
      `
      )
      .eq("is_winner", true),
  ]);

  const playIds = new Set((plays ?? []).map((p) => p.id));
  const winners = (participantRows ?? []).filter((row) =>
    playIds.has(row.play_id)
  );

  const allPlays = plays ?? [];
  const totalPlays = allPlays.length;
  const uniqueGames = new Set(allPlays.map((p) => p.game_id)).size;
  const playsThisMonth = allPlays.filter(
    (p) => new Date(p.played_at) >= monthStart
  ).length;

  const gameCounts = new Map<string, { title: string; count: number }>();
  for (const play of allPlays) {
    const game = Array.isArray(play.game) ? play.game[0] : play.game;
    if (!game) continue;
    const entry = gameCounts.get(game.id) ?? { title: game.title, count: 0 };
    entry.count += 1;
    gameCounts.set(game.id, entry);
  }

  const topGames = [...gameCounts.entries()]
    .map(([game_id, { title, count }]) => ({
      game_id,
      title,
      play_count: count,
    }))
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 8);

  const winnerCounts = new Map<string, { display_name: string; wins: number }>();
  for (const row of winners) {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const userId = profile?.id ?? row.user_id;
    const name = profile?.display_name ?? "Someone";
    const entry = winnerCounts.get(userId) ?? {
      display_name: name,
      wins: 0,
    };
    entry.wins += 1;
    winnerCounts.set(userId, entry);
  }

  const topWinners = [...winnerCounts.entries()]
    .map(([user_id, { display_name, wins }]) => ({
      user_id,
      display_name,
      wins,
    }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 8);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">Group Stats</h1>
      <p className="text-sm text-muted mb-6">Play history at a glance</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={BarChart3}
          label="Total plays"
          value={String(totalPlays)}
        />
        <StatCard
          icon={Dices}
          label="Games played"
          value={String(uniqueGames)}
        />
        <StatCard
          icon={Calendar}
          label="This month"
          value={String(playsThisMonth)}
        />
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Dices className="h-4 w-4 text-primary" />
          Most played
        </h2>
        {topGames.length === 0 ? (
          <p className="text-sm text-muted">No plays logged yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {topGames.map((g) => (
              <Link
                key={g.game_id}
                href={`/library/${g.game_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
              >
                <span className="font-medium truncate pr-2">{g.title}</span>
                <span className="text-muted shrink-0">{g.play_count} plays</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Top winners
        </h2>
        {topWinners.length === 0 ? (
          <p className="text-sm text-muted">
            No winners recorded yet — mark winners when logging a play.
          </p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {topWinners.map((w) => (
              <Link
                key={w.user_id}
                href={`/users/${w.user_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2"
              >
                <span className="font-medium">{w.display_name}</span>
                <span className="text-muted">
                  {w.wins} win{w.wins !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/plays/new"
        className="mt-6 block text-center text-sm text-primary hover:underline"
      >
        Log a play →
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
    </div>
  );
}
