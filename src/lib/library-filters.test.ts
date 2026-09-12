import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_FILTERS,
  applyLibraryFilters,
  hasActiveLibraryFilters,
} from "@/lib/library-filters";
import type { GameWithOwners } from "@/lib/types";

function game(
  overrides: Partial<GameWithOwners> & { id: string; title: string }
): GameWithOwners {
  return {
    description: null,
    min_players: 2,
    max_players: 4,
    play_time_minutes: 60,
    image_url: null,
    bgg_id: null,
    created_by: null,
    created_at: "",
    owners: [],
    ...overrides,
  };
}

describe("applyLibraryFilters maxWeight", () => {
  const games = [
    game({ id: "light", title: "Light", bgg_weight: 1.8 }),
    game({ id: "heavy", title: "Heavy", bgg_weight: 4.1 }),
    game({ id: "unknown", title: "Unknown" }),
  ];

  it("keeps games at or under the cap and unknown weight", () => {
    const result = applyLibraryFilters(
      games,
      { ...DEFAULT_LIBRARY_FILTERS, maxWeight: 2.5 },
      {}
    );
    expect(result.map((g) => g.id)).toEqual(["light", "unknown"]);
  });
});

describe("applyLibraryFilters unplayedOnly", () => {
  const games = [
    game({ id: "dated", title: "Dated" }),
    game({ id: "marked", title: "Marked" }),
    game({ id: "fresh", title: "Fresh" }),
  ];

  it("uses last-played dates when no playedGameIds are provided", () => {
    const result = applyLibraryFilters(
      games,
      { ...DEFAULT_LIBRARY_FILTERS, unplayedOnly: true },
      { lastPlayedByGameId: { dated: "2026-01-01" } }
    );
    expect(result.map((g) => g.id)).toEqual(["marked", "fresh"]);
  });

  it("treats undated marks as played", () => {
    const result = applyLibraryFilters(
      games,
      { ...DEFAULT_LIBRARY_FILTERS, unplayedOnly: true },
      { playedGameIds: new Set(["marked"]) }
    );
    expect(result.map((g) => g.id)).toEqual(["dated", "fresh"]);
  });
});

describe("hasActiveLibraryFilters", () => {
  it("is false for defaults and true for any applied filter", () => {
    expect(hasActiveLibraryFilters(DEFAULT_LIBRARY_FILTERS)).toBe(false);
    expect(
      hasActiveLibraryFilters({ ...DEFAULT_LIBRARY_FILTERS, noOwnersOnly: true })
    ).toBe(true);
  });
});

describe("applyLibraryFilters ownership", () => {
  const alice = {
    user_id: "alice",
    display_name: "Alice",
    avatar_url: null,
    condition: "good",
    notes: null,
    acquired_date: null,
  };
  const games = [
    game({ id: "owned", title: "Owned", owners: [alice] }),
    game({ id: "orphan", title: "Orphan" }),
  ];

  it("filters to a selected owner", () => {
    const result = applyLibraryFilters(games, {
      ...DEFAULT_LIBRARY_FILTERS,
      ownerId: "alice",
    });
    expect(result.map((g) => g.id)).toEqual(["owned"]);
  });

  it("filters to games with no owners", () => {
    const result = applyLibraryFilters(games, {
      ...DEFAULT_LIBRARY_FILTERS,
      noOwnersOnly: true,
    });
    expect(result.map((g) => g.id)).toEqual(["orphan"]);
  });
});

