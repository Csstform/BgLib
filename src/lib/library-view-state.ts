import {
  DEFAULT_LIBRARY_FILTERS,
  type LibraryFilters,
} from "@/lib/library-filters";

export type LibraryViewMode = "nested" | "flat";

export type LibraryViewState = {
  search: string;
  viewMode: LibraryViewMode;
  filters: LibraryFilters;
};

export const DEFAULT_LIBRARY_VIEW_STATE: LibraryViewState = {
  search: "",
  viewMode: "nested",
  filters: DEFAULT_LIBRARY_FILTERS,
};

export function libraryViewStorageKey(groupId: string): string {
  return `bglib-library-view:${groupId}`;
}

function isViewMode(value: unknown): value is LibraryViewMode {
  return value === "nested" || value === "flat";
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizeLibraryViewState(
  raw: unknown,
  userId?: string
): LibraryViewState {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawFilters =
    input.filters && typeof input.filters === "object"
      ? (input.filters as Record<string, unknown>)
      : {};

  let ownerId = optionalString(rawFilters.ownerId);
  if (rawFilters.ownedByMeOnly === true && userId) {
    ownerId = userId;
  }

  const noOwnersOnly = rawFilters.noOwnersOnly === true;
  if (noOwnersOnly) {
    ownerId = null;
  }

  return {
    search: typeof input.search === "string" ? input.search : "",
    viewMode: isViewMode(input.viewMode) ? input.viewMode : "nested",
    filters: {
      ownerId,
      minPlayers: optionalNumber(rawFilters.minPlayers),
      maxPlayers: optionalNumber(rawFilters.maxPlayers),
      maxPlayTime: optionalNumber(rawFilters.maxPlayTime),
      unplayedOnly: rawFilters.unplayedOnly === true,
      noOwnersOnly,
      maxWeight: optionalNumber(rawFilters.maxWeight),
    },
  };
}

export function loadLibraryViewState(
  groupId: string,
  userId?: string
): LibraryViewState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(libraryViewStorageKey(groupId));
    if (!raw) return null;
    return normalizeLibraryViewState(JSON.parse(raw), userId);
  } catch {
    return null;
  }
}

export function saveLibraryViewState(
  groupId: string,
  state: LibraryViewState
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(libraryViewStorageKey(groupId), JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
