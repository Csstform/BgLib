import { describe, expect, it } from "vitest";
import {
  createCalendarFeedToken,
  parseCalendarFeedToken,
} from "@/lib/calendar-feed";

describe("calendar feed tokens", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const groupId = "22222222-2222-2222-2222-222222222222";

  it("round-trips a valid token", () => {
    const token = createCalendarFeedToken(userId, groupId);
    expect(parseCalendarFeedToken(token)).toEqual({ userId, groupId });
  });

  it("rejects a tampered token", () => {
    const token = createCalendarFeedToken(userId, groupId);
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [uid, gid, signature] = decoded.split(":");
    const flipped = signature.endsWith("a") ? `${signature.slice(0, -1)}b` : `${signature.slice(0, -1)}a`;
    const tampered = Buffer.from(`${uid}:${gid}:${flipped}`, "utf8").toString(
      "base64url"
    );
    expect(parseCalendarFeedToken(tampered)).toBeNull();
    expect(parseCalendarFeedToken("not-a-token")).toBeNull();
  });
});
