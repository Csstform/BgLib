const UNDERPLAYED_DAYS = 180;

export type PickerWeights = {
  neverPlayed: number;
  underplayed: number;
  wantToPlay: number;
};

export const DEFAULT_PICKER_WEIGHTS: PickerWeights = {
  neverPlayed: 100,
  underplayed: 50,
  wantToPlay: 30,
};

export function daysSince(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computePickerScore(opts: {
  lastPlayedAt: string | null;
  playCount: number;
  wantCount: number;
  weights?: PickerWeights;
}): number {
  const weights = opts.weights ?? DEFAULT_PICKER_WEIGHTS;
  let score = 0;

  if (opts.playCount === 0) {
    score += weights.neverPlayed;
  } else {
    const days = daysSince(opts.lastPlayedAt);
    if (days !== null && days >= UNDERPLAYED_DAYS) {
      score += weights.underplayed;
    }
  }

  if (opts.wantCount > 0) {
    score += weights.wantToPlay;
  }

  return score;
}

export function comparePickerGames(
  a: { picker_score: number; last_played_at: string | null },
  b: { picker_score: number; last_played_at: string | null }
): number {
  if (b.picker_score !== a.picker_score) {
    return b.picker_score - a.picker_score;
  }
  if (!a.last_played_at && !b.last_played_at) return 0;
  if (!a.last_played_at) return -1;
  if (!b.last_played_at) return 1;
  return (
    new Date(a.last_played_at).getTime() - new Date(b.last_played_at).getTime()
  );
}
