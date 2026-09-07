import { describe, expect, it } from "vitest";
import { isUndatedPlay, summarizePlayDates } from "@/lib/play-dates";

describe("isUndatedPlay", () => {
  it("is true only for explicit undated rows", () => {
    expect(isUndatedPlay({ undated: true })).toBe(true);
    expect(isUndatedPlay({ undated: false })).toBe(false);
    expect(isUndatedPlay({})).toBe(false);
  });
});

describe("summarizePlayDates", () => {
  it("counts undated plays as played without a last-played date", () => {
    const { lastPlayedByGameId, playedGameIds } = summarizePlayDates([
      {
        game_id: "g1",
        played_at: "2026-09-07T12:00:00.000Z",
        undated: true,
      },
      {
        game_id: "g1",
        played_at: "2026-01-01T12:00:00.000Z",
        undated: false,
      },
      {
        game_id: "g2",
        played_at: "2026-09-07T12:00:00.000Z",
        undated: true,
      },
    ]);

    expect(playedGameIds.sort()).toEqual(["g1", "g2"]);
    expect(lastPlayedByGameId).toEqual({
      g1: "2026-01-01T12:00:00.000Z",
    });
  });
});
