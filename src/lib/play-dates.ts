export function isUndatedPlay(play: { undated?: boolean | null }): boolean {
  return play.undated === true;
}

export function summarizePlayDates(
  plays: { game_id: string; played_at: string; undated?: boolean | null }[]
): {
  lastPlayedByGameId: Record<string, string>;
  playedGameIds: string[];
} {
  const lastPlayedByGameId: Record<string, string> = {};
  const played = new Set<string>();

  for (const play of plays) {
    played.add(play.game_id);
    if (isUndatedPlay(play)) continue;
    if (!lastPlayedByGameId[play.game_id]) {
      lastPlayedByGameId[play.game_id] = play.played_at;
    }
  }

  return { lastPlayedByGameId, playedGameIds: [...played] };
}
