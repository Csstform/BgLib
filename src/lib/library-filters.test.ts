import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_FILTERS,
  applyLibraryFilters,
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
