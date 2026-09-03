import { describe, expect, it } from "vitest";
import { computeTopWinners, computeUniquePlayers } from "@/lib/play-stats";

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
