import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Trophy,
  Dices,
  Calendar,
  PackageOpen,
  Users,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaysTrendChart } from "@/components/PlaysTrendChart";
import { StatsExportButton } from "@/components/StatsExportButton";
import {
  computeNeverPlayedGames,
  computePlaysByMonth,
  computeTopGames,
  computeTopWinners,
  computeUniquePlayers,
  countPlaysThisMonth,
} from "@/lib/play-stats";

export default async function StatsPage() {
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

  const [
    { data: plays },
    { data: participantRows },
    { data: games },
    { data: ownerships },
  ] = await Promise.all([
    supabase
      .from("plays")
      .select("id, game_id, played_at, game:games (id, title)")
      .eq("group_id", groupId)
      .order("played_at", { ascending: false }),
    supabase.from("play_participants").select(
      `
        play_id,
        user_id,
        is_winner,
        profile:profiles!play_participants_user_id_fkey (display_name)
      `
    ),
    supabase
      .from("games")
      .select("id, title, image_url")
      .eq("group_id", groupId),
    supabase.from("ownership").select("game_id"),
  ]);

  const playIds = new Set((plays ?? []).map((p) => p.id));
  const groupParticipants = (participantRows ?? []).filter((row) =>
    playIds.has(row.play_id)
  );

  const participantsByPlay = new Map<
    string,
    { names: string[]; winners: string[] }
  >();
  for (const row of groupParticipants) {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const name = profile?.display_name ?? "Someone";
    const entry = participantsByPlay.get(row.play_id) ?? {
      names: [],
      winners: [],
    };
    entry.names.push(name);
    if (row.is_winner) entry.winners.push(name);
    participantsByPlay.set(row.play_id, entry);
  }

  const allPlays = plays ?? [];
  const totalPlays = allPlays.length;
  const uniqueGames = new Set(allPlays.map((p) => p.game_id)).size;
  const playsThisMonth = countPlaysThisMonth(allPlays);
  const uniquePlayers = computeUniquePlayers(groupParticipants, playIds);
  const playsByMonth = computePlaysByMonth(allPlays);

  const topGames = computeTopGames(allPlays);
  const topWinners = computeTopWinners(
    groupParticipants.filter((r) => r.is_winner === true)
  );

  const recentActivity = allPlays.slice(0, 15).map((play) => {
    const game = Array.isArray(play.game) ? play.game[0] : play.game;
    const part = participantsByPlay.get(play.id);
    return {
      play_id: play.id,
      game_id: play.game_id,
      played_at: play.played_at,
      title: game?.title ?? "Unknown game",
      winner_names: part?.winners ?? [],
      participant_count: part?.names.length ?? 0,
    };
  });

  const exportRows = allPlays.map((play) => {
    const game = Array.isArray(play.game) ? play.game[0] : play.game;
    const part = participantsByPlay.get(play.id);
    return {
      played_at: play.played_at,
      title: game?.title ?? "Unknown game",
      winner_names: part?.winners ?? [],
      participant_count: part?.names.length ?? 0,
    };
  });

  const playedGameIds = new Set(allPlays.map((p) => p.game_id));
  const groupGameIds = new Set((games ?? []).map((g) => g.id));
  const ownedGameIds = new Set(
    (ownerships ?? [])
      .map((o) => o.game_id)
      .filter((id) => groupGameIds.has(id))
  );
  const neverPlayed = computeNeverPlayedGames(
    games ?? [],
    playedGameIds,
    ownedGameIds
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="Group Stats"
        subtitle="Play history at a glance"
        action={<StatsExportButton rows={exportRows} />}
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
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
        <StatCard
          icon={Users}
          label="Players"
          value={String(uniquePlayers)}
        />
      </div>

      {totalPlays > 0 && (
        <section className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold mb-3 text-sm">Plays per month</h2>
          <PlaysTrendChart data={playsByMonth} />
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Recent activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted">No plays logged yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {recentActivity.map((p) => (
              <Link
                key={p.play_id}
                href={`/library/${p.game_id}`}
                className="block px-4 py-3 text-sm hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{p.title}</span>
                  <span className="text-xs text-muted shrink-0">
                    {new Date(p.played_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {p.participant_count} player
                  {p.participant_count !== 1 ? "s" : ""}
                  {p.winner_names.length > 0 && (
                    <>
                      {" · "}
                      <Trophy className="inline h-3 w-3 text-amber-400 -mt-0.5" />{" "}
                      {p.winner_names.join(", ")}
                    </>
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

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

      <section className="mb-6">
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

      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <PackageOpen className="h-4 w-4 text-primary" />
          Never played
        </h2>
        {neverPlayed.length === 0 ? (
          <p className="text-sm text-muted">
            Every owned game in this group has at least one play logged.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted mb-2">
              {neverPlayed.length} owned game
              {neverPlayed.length !== 1 ? "s" : ""} waiting for a first play
            </p>
            <div className="rounded-xl border border-border bg-surface divide-y divide-border">
              {neverPlayed.slice(0, 12).map((g) => (
                <Link
                  key={g.game_id}
                  href={`/library/${g.game_id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2"
                >
                  {g.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.image_url}
                      alt=""
                      className="h-10 w-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-surface-2 shrink-0" />
                  )}
                  <span className="font-medium truncate">{g.title}</span>
                </Link>
              ))}
            </div>
            {neverPlayed.length > 12 && (
              <p className="text-xs text-muted mt-2">
                +{neverPlayed.length - 12} more — check the library &quot;Unplayed&quot; filter
              </p>
            )}
          </>
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
