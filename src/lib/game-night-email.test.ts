import { describe, expect, it } from "vitest";
import {
  buildGameNightInviteEmail,
  escapeHtml,
} from "@/lib/game-night-email";

describe("escapeHtml", () => {
  it("escapes tags", () => {
    expect(escapeHtml("<Catan>")).toBe("&lt;Catan&gt;");
  });
});

describe("buildGameNightInviteEmail", () => {
  it("includes host, title, RSVP link, and escaped user text", () => {
    const { subject, html } = buildGameNightInviteEmail({
      title: "Friday <Catan>",
      scheduledAtIso: "2026-08-28T18:00:00.000Z",
      location: "Alice's place",
      hostName: "Alice Example",
      description: "Bring snacks",
      gameTitles: ["Catan", "Azul"],
      eventUrl: "https://bglib.example.com/game-nights/abc",
    });

    expect(subject).toContain("Friday <Catan>");
    expect(html).toContain("Friday &lt;Catan&gt;");
    expect(html).not.toContain("<Catan>");
    expect(html).toContain("Alice Example");
    expect(html).toContain("Catan, Azul");
    expect(html).toContain("RSVP in BgLib");
    expect(html).toContain("https://bglib.example.com/game-nights/abc");
  });
});
