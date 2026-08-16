import { pickRandomItem } from "@/lib/random";

export type StartPlayer = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

export function pickRandomPlayer<T extends { id: string }>(players: T[]): T | null {
  return pickRandomItem(players);
}
