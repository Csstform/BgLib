import { describe, expect, it } from "vitest";
import {
  buildCalendarHttpUrl,
  buildCalendarWebcalUrl,
  buildGoogleCalendarSubscribeUrl,
} from "@/lib/calendar-feed-url";

describe("calendar feed URLs", () => {
  const token = "abc.def";
  const appUrl = "https://bglib.example.com/";

  it("builds an https .ics URL", () => {
    expect(buildCalendarHttpUrl(token, appUrl)).toBe(
      "https://bglib.example.com/api/game-nights/calendar/abc.def.ics"
    );
  });

  it("builds a webcal URL", () => {
    expect(buildCalendarWebcalUrl(token, appUrl)).toBe(
      "webcal://bglib.example.com/api/game-nights/calendar/abc.def.ics"
    );
  });

  it("builds a Google Calendar subscribe URL from webcal", () => {
    const url = buildGoogleCalendarSubscribeUrl(token, appUrl);
    expect(url.startsWith("https://calendar.google.com/calendar/r?cid=")).toBe(
      true
    );
    expect(url).toContain("webcal");
  });
});
