import { profileName } from "@/lib/profile-name";

export type PlayParticipantInput = {
  user_id?: string | null;
  guest_name?: string | null;
  is_winner?: boolean;
  score?: number | null;
};

export type PlayParticipantRow = {
  play_id: string;
  user_id: string | null;
  guest_name: string | null;
  is_winner: boolean;
  score: number | null;
};

export function playParticipantLabel(row: {
  guest_name?: string | null;
  user_id?: string | null;
  profile?:
    | { display_name?: string | null; real_name?: string | null }
    | { display_name?: string | null; real_name?: string | null }[]
    | null;
}): string {
  if (row.guest_name?.trim()) return row.guest_name.trim();
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return profileName(profile);
}

export function guestParticipantKey(name: string): string {
  return `g:${name.trim()}`;
}

export function normalizePlayParticipantInputs(
  raw: PlayParticipantInput[]
): { members: PlayParticipantInput[]; guests: PlayParticipantInput[] } {
  const members: PlayParticipantInput[] = [];
  const guests: PlayParticipantInput[] = [];
  const seenUsers = new Set<string>();
  const seenGuests = new Set<string>();

  for (const row of raw) {
    const userId = row.user_id?.trim() || null;
    const guestName = row.guest_name?.trim() || null;
    let score: number | null = null;
    if (row.score != null && Number.isFinite(row.score)) score = row.score;

    if (userId) {
      if (seenUsers.has(userId)) continue;
      seenUsers.add(userId);
      members.push({
        user_id: userId,
        guest_name: null,
        is_winner: !!row.is_winner,
        score,
      });
      continue;
    }

    if (guestName) {
      const key = guestName.toLowerCase();
      if (seenGuests.has(key)) continue;
      seenGuests.add(key);
      guests.push({
        user_id: null,
        guest_name: guestName,
        is_winner: !!row.is_winner,
        score,
      });
    }
  }

  return { members, guests };
}

export function playParticipantRowsFromInput(
  playId: string,
  raw: PlayParticipantInput[]
): PlayParticipantRow[] {
  const { members, guests } = normalizePlayParticipantInputs(raw);
  return [...members, ...guests].map((row) => ({
    play_id: playId,
    user_id: row.user_id ?? null,
    guest_name: row.guest_name ?? null,
    is_winner: !!row.is_winner,
    score: row.score ?? null,
  }));
}

export function playParticipantKey(row: {
  user_id?: string | null;
  guest_name?: string | null;
}): string | null {
  if (row.user_id) return row.user_id;
  if (row.guest_name?.trim()) return guestParticipantKey(row.guest_name);
  return null;
}

export function playParticipantDisplays(
  rows: {
    guest_name?: string | null;
    user_id?: string | null;
    is_winner?: boolean;
    score?: number | null;
    profile?:
      | { display_name?: string | null; real_name?: string | null }
      | { display_name?: string | null; real_name?: string | null }[]
      | null;
  }[]
): { winnerNames: string[]; otherParticipants: string[] } {
  const winnerNames: string[] = [];
  const otherParticipants: string[] = [];

  for (const row of rows) {
    const name = playParticipantLabel(row);
    if (!name) continue;
    const labeled = row.score != null ? `${name} (${row.score} pts)` : name;
    if (row.is_winner) winnerNames.push(name);
    else otherParticipants.push(labeled);
  }

  return { winnerNames, otherParticipants };
}
