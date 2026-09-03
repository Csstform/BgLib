import { describe, expect, it } from "vitest";
import {
  buildGameNightShareMessage,
  gameNightEventUrl,
  gameNightShareTitle,
} from "@/lib/game-night-share";

describe("gameNightEventUrl", () => {
  it("strips a trailing slash from the origin", () => {
    expect(gameNightEventUrl("https://bglib.example.com/", "abc")).toBe(
      "https://bglib.example.com/game-nights/abc"
    );
  });
});

describe("gameNightShareTitle", () => {
  it("labels the event as a game night", () => {
    expect(gameNightShareTitle("Friday Catan")).toBe("Friday Catan — game night");
  });
});

describe("buildGameNightShareMessage", () => {
  it("includes when, where, host, games, and RSVP link", () => {
    const message = buildGameNightShareMessage({
      title: "Friday Catan",
      when: "Fri, Sep 4, 7:00 PM",
      location: "Alice's place",
      hostName: "Alice",
      gameTitles: ["Catan", "Azul"],
      eventUrl: "https://bglib.example.com/game-nights/abc",
    });

    expect(message).toContain("Friday Catan");
    expect(message).toContain("Fri, Sep 4, 7:00 PM");
    expect(message).toContain("At Alice's place");
    expect(message).toContain("Hosted by Alice");
    expect(message).toContain("Games: Catan, Azul");
    expect(message).toContain("RSVP: https://bglib.example.com/game-nights/abc");
    expect(message).not.toContain("invite code");
  });

  it("adds group join instructions when an invite code is present", () => {
    const message = buildGameNightShareMessage({
      title: "Friday Catan",
      when: "Fri, Sep 4, 7:00 PM",
      eventUrl: "https://bglib.example.com/game-nights/abc",
      groupName: "Friday Night Games",
      inviteCode: "ABCD1234",
      signupUrl: "https://bglib.example.com/signup",
    });

    expect(message).toContain('Join "Friday Night Games" with invite code ABCD1234.');
    expect(message).toContain("Sign up: https://bglib.example.com/signup");
  });

  it("omits empty optional fields", () => {
    const message = buildGameNightShareMessage({
      title: "Open night",
      when: "Sat, Sep 5, 6:00 PM",
      location: "  ",
      hostName: null,
      gameTitles: [],
      eventUrl: "https://bglib.example.com/game-nights/xyz",
    });

    expect(message).toBe(
      ["Open night", "Sat, Sep 5, 6:00 PM", "", "RSVP: https://bglib.example.com/game-nights/xyz"].join(
        "\n"
      )
    );
  });
});
