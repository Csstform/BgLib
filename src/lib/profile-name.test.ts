import { describe, expect, it } from "vitest";
import { profileName, profileUsername } from "@/lib/profile-name";

describe("profileName", () => {
  it("uses real name when set", () => {
    expect(
      profileName({ display_name: "alice", real_name: "Alice Example" })
    ).toBe("Alice Example");
  });

  it("falls back to username when real name is blank", () => {
    expect(profileName({ display_name: "alice", real_name: "  " })).toBe(
      "alice"
    );
  });

  it("uses a custom fallback", () => {
    expect(profileName(null, "there")).toBe("there");
  });

  it("returns Someone when nothing is set", () => {
    expect(profileName(undefined)).toBe("Someone");
  });
});

describe("profileUsername", () => {
  it("returns the trimmed username", () => {
    expect(profileUsername({ display_name: "  alice  " })).toBe("alice");
  });
});
