import { describe, expect, it } from "vitest";
import {
  guestParticipantKey,
  playParticipantDisplays,
  playParticipantLabel,
  playParticipantRowsFromInput,
} from "@/lib/play-participant";

describe("playParticipantLabel", () => {
  it("prefers a guest name over a missing profile", () => {
    expect(
      playParticipantLabel({ guest_name: "Sam", profile: null })
    ).toBe("Sam");
  });

  it("uses the public profile name for members", () => {
    expect(
      playParticipantLabel({
        user_id: "u1",
        profile: { display_name: "alice", real_name: "Alice Tester" },
      })
    ).toBe("Alice Tester");
  });
});

describe("playParticipantRowsFromInput", () => {
  it("keeps members and guests as separate rows", () => {
    const rows = playParticipantRowsFromInput("play-1", [
      { user_id: "u1", is_winner: true, score: 12 },
      { guest_name: "  Pat  ", is_winner: false, score: 8 },
      { guest_name: "pat" },
    ]);
    expect(rows).toEqual([
      {
        play_id: "play-1",
        user_id: "u1",
        guest_name: null,
        is_winner: true,
        score: 12,
      },
      {
        play_id: "play-1",
        user_id: null,
        guest_name: "Pat",
        is_winner: false,
        score: 8,
      },
    ]);
  });
});

describe("guestParticipantKey", () => {
  it("prefixes a trimmed name", () => {
    expect(guestParticipantKey("  Pat ")).toBe("g:Pat");
  });
});

describe("playParticipantDisplays", () => {
  it("labels guests and attaches scores to non-winners", () => {
    expect(
      playParticipantDisplays([
        {
          user_id: "u1",
          is_winner: true,
          profile: { display_name: "alice", real_name: "Alice" },
        },
        { guest_name: "Pat", is_winner: false, score: 8, profile: null },
      ])
    ).toEqual({
      winnerNames: ["Alice"],
      otherParticipants: ["Pat (8 pts)"],
    });
  });
});
