import type { NeverPlayedGame, PlayerStats } from "@/lib/types";

type PlayRow = {
  id: string;
  game_id: string;
  played_at: string;
  game: { id: string; title: string } | { id: string; title: string }[] | null;
};

type ParticipationRow = {
  play_id: string;
  is_winner: boolean | null;
};

type GameRow = {
  id: string;
  title: string;
  image_url: string | null;
};

function unwrapGame(
  game: PlayRow["game"]
): { id: string; title: string } | null {
  if (!game) return null;
  return Array.isArray(game) ? (game[0] ?? null) : game;
}

export function computePlayerStats(
  plays: PlayRow[],
  participations: ParticipationRow[]
): PlayerStats {
  const participationByPlay = new Map(
    participations.map((p) => [p.play_id, p])
  );

  const userPlays: {
    play_id: string;
    game_id: string;
    title: string;
    played_at: string;
    is_winner: boolean;
  }[] = [];

  for (const play of plays) {
    const part = participationByPlay.get(play.id);
    if (!part) continue;

    const game = unwrapGame(play.game);
    if (!game) continue;

    userPlays.push({
      play_id: play.id,
      game_id: game.id,
      title: game.title,
      played_at: play.played_at,
      is_winner: part.is_winner === true,
    });
  }

  const wins = userPlays.filter((p) => p.is_winner).length;

  const gameCounts = new Map<string, { title: string; count: number }>();
  for (const play of userPlays) {
    const entry = gameCounts.get(play.game_id) ?? {
      title: play.title,
      count: 0,
    };
    entry.count += 1;
    gameCounts.set(play.game_id, entry);
  }

  const mostPlayedGames = [...gameCounts.entries()]
    .map(([game_id, { title, count }]) => ({
      game_id,
      title,
      play_count: count,
    }))
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 5);

  const recentPlays = [...userPlays]
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    .slice(0, 5);

  return {
    totalPlays: userPlays.length,
    wins,
    mostPlayedGames,
    recentPlays,
  };
}

export function computeNeverPlayedGames(
  games: GameRow[],
  playedGameIds: Set<string>,
  ownedGameIds: Set<string>
): NeverPlayedGame[] {
  return games
    .filter((g) => ownedGameIds.has(g.id) && !playedGameIds.has(g.id))
    .map((g) => ({
      game_id: g.id,
      title: g.title,
      image_url: g.image_url,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function countPlaysThisMonth(plays: { played_at: string }[]): number {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return plays.filter((p) => new Date(p.played_at) >= monthStart).length;
}

export function computeTopGames(
  plays: PlayRow[],
  limit = 8
): { game_id: string; title: string; play_count: number }[] {
  const gameCounts = new Map<string, { title: string; count: number }>();
  for (const play of plays) {
    const game = unwrapGame(play.game);
    if (!game) continue;
    const entry = gameCounts.get(game.id) ?? { title: game.title, count: 0 };
    entry.count += 1;
    gameCounts.set(game.id, entry);
  }

  return [...gameCounts.entries()]
    .map(([game_id, { title, count }]) => ({
      game_id,
      title,
      play_count: count,
    }))
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, limit);
}

export function computeTopWinners(
  winners: {
    user_id: string;
    profile:
      | { id?: string; display_name: string }
      | { id?: string; display_name: string }[]
      | null;
  }[],
  limit = 8
): { user_id: string; display_name: string; wins: number }[] {
  const winnerCounts = new Map<
    string,
    { display_name: string; wins: number }
  >();

  for (const row of winners) {
    const profile = Array.isArray(row.profile)
      ? row.profile[0]
      : row.profile;
    const userId = profile?.id ?? row.user_id;
    const name = profile?.display_name ?? "Someone";
    const entry = winnerCounts.get(userId) ?? {
      display_name: name,
      wins: 0,
    };
    entry.wins += 1;
    winnerCounts.set(userId, entry);
  }

  return [...winnerCounts.entries()]
    .map(([user_id, { display_name, wins }]) => ({
      user_id,
      display_name,
      wins,
    }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, limit);
}

export function computePlaysByMonth(
  plays: { played_at: string }[],
  months = 6
): { label: string; year: number; month: number; count: number }[] {
  const now = new Date();
  const buckets: { label: string; year: number; month: number; count: number }[] =
    [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    });
  }

  for (const play of plays) {
    const d = new Date(play.played_at);
    const bucket = buckets.find(
      (b) => b.year === d.getFullYear() && b.month === d.getMonth()
    );
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

export type RecentPlayRow = {
  play_id: string;
  game_id: string;
  title: string;
  played_at: string;
  winner_names: string[];
  participant_count: number;
};

export function computeUniquePlayers(
  participations: { user_id: string; play_id: string }[],
  playIds: Set<string>
): number {
  const users = new Set<string>();
  for (const row of participations) {
    if (playIds.has(row.play_id)) users.add(row.user_id);
  }
  return users.size;
}

export function playsToCsv(
  rows: {
    played_at: string;
    title: string;
    winner_names: string[];
    participant_count: number;
  }[]
): string {
  const header = "date,game,winners,participants";
  const lines = rows.map((r) => {
    const date = new Date(r.played_at).toISOString().slice(0, 10);
    const game = `"${r.title.replace(/"/g, '""')}"`;
    const winners = `"${r.winner_names.join("; ").replace(/"/g, '""')}"`;
    return `${date},${game},${winners},${r.participant_count}`;
  });
  return [header, ...lines].join("\n");
}
