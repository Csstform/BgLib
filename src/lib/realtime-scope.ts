export type RealtimeTable =
  | "loans"
  | "game_night_rsvps"
  | "games"
  | "plays"
  | "want_to_play";

/** Tables that can be refreshed via /api/library without a full page reload. */
export const LIBRARY_DATA_TABLES: RealtimeTable[] = [
  "games",
  "plays",
  "want_to_play",
];

export function tableAffectsPath(table: RealtimeTable, pathname: string): boolean {
  switch (table) {
    case "loans":
      return pathname.startsWith("/loans");
    case "game_night_rsvps":
      return pathname.startsWith("/game-nights");
    case "games":
      return (
        pathname.startsWith("/library") ||
        pathname.startsWith("/collection") ||
        pathname.startsWith("/picker") ||
        pathname.startsWith("/add-game") ||
        pathname.startsWith("/stats") ||
        pathname.startsWith("/users") ||
        pathname.startsWith("/plays") ||
        pathname === "/"
      );
    case "plays":
      return (
        pathname.startsWith("/library") ||
        pathname.startsWith("/stats") ||
        pathname.startsWith("/plays") ||
        pathname.startsWith("/users/") ||
        pathname.startsWith("/picker")
      );
    case "want_to_play":
      return pathname.startsWith("/library") || pathname.startsWith("/picker");
    default:
      return false;
  }
}

export function shouldClientFetchLibrary(tables: RealtimeTable[]): boolean {
  return tables.some((t) => LIBRARY_DATA_TABLES.includes(t));
}

export const REALTIME_CHANGED_EVENT = "bglib:data-changed";

export function dispatchRealtimeChange(tables: RealtimeTable[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALTIME_CHANGED_EVENT, { detail: { tables } })
  );
}
