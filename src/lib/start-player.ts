export type StartPlayer = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

/** Uniform random index using crypto.getRandomValues when available. */
export function pickRandomIndex(count: number): number {
  if (count <= 0) return -1;

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const max = 0x100000000;
    const limit = max - (max % count);
    const buf = new Uint32Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % count;
  }

  return Math.floor(Math.random() * count);
}

export function pickRandomPlayer<T extends { id: string }>(players: T[]): T | null {
  const index = pickRandomIndex(players.length);
  return index >= 0 ? players[index] : null;
}
