import { describe, expect, it } from "vitest";
import { normalizeCalendarFeedToken } from "@/lib/calendar-feed-response";

describe("normalizeCalendarFeedToken", () => {
  it("strips a trailing .ics suffix", () => {
    expect(normalizeCalendarFeedToken("abc123.ics")).toBe("abc123");
  });

  it("decodes a URL-encoded token", () => {
    expect(normalizeCalendarFeedToken("abc%2B123")).toBe("abc+123");
  });
});
