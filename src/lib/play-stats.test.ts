import { describe, expect, it } from "vitest";
import {
  computePlayerStats,
  computeTopWinners,
  computeUniquePlayers,
} from "@/lib/play-stats";

describe("computePlayerStats", () => {
  it("keeps undated marks in totals but out of recent plays", () => {
    const stats = computePlayerStats(
      [
        {
          id: "dated",
          game_id: "g1",
          played_at: "2026-01-01T12:00:00.000Z",
          undated: false,
          game: { id: "g1", title: "Catan" },
        },
        {
          id: "marked",
          game_id: "g2",
          played_at: "2026-09-07T12:00:00.000Z",
          undated: true,
          game: { id: "g2", title: "Ticket to Ride" },
        },
      ],
      [
        { play_id: "dated", is_winner: true },
        { play_id: "marked", is_winner: false },
      ]
    );

    expect(stats.totalPlays).toBe(2);
    expect(stats.recentPlays.map((p) => p.play_id)).toEqual(["dated"]);
  });
});

describe("computeTopWinners", () => {
  it("skips guest winners so they are not linked as members", () => {
    const winners = computeTopWinners([
      {
        user_id: "u1",
        profile: { id: "u1", display_name: "alice", real_name: "Alice" },
      },
      { user_id: null, profile: null },
      {
        user_id: "u1",
        profile: { id: "u1", display_name: "alice", real_name: "Alice" },
      },
    ]);

    expect(winners).toEqual([{ user_id: "u1", display_name: "Alice", wins: 2 }]);
  });
});

describe("computeUniquePlayers", () => {
  it("counts members and guests separately", () => {
    const count = computeUniquePlayers(
      [
        { play_id: "p1", user_id: "u1" },
        { play_id: "p1", guest_name: "Pat" },
        { play_id: "p2", guest_name: "pat" },
        { play_id: "other", user_id: "u2" },
      ],
      new Set(["p1", "p2"])
    );

    expect(count).toBe(2);
  });
});
