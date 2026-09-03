import { describe, expect, it } from "vitest";
import {
  groupJoinPath,
  groupJoinUrl,
  normalizeInviteCode,
} from "@/lib/group-invite";

describe("normalizeInviteCode", () => {
  it("uppercases and strips junk", () => {
    expect(normalizeInviteCode(" ab-cd_12 ")).toBe("ABCD12");
  });
});

describe("groupJoinUrl", () => {
  it("builds a join path from the code", () => {
    expect(groupJoinPath("abcd1234")).toBe("/join/ABCD1234");
    expect(groupJoinUrl("https://bglib.example.com/", "abcd1234")).toBe(
      "https://bglib.example.com/join/ABCD1234"
    );
  });
});
