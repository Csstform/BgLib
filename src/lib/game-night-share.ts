export type GameNightShareInput = {
  title: string;
  when: string;
  location?: string | null;
  hostName?: string | null;
  gameTitles?: string[];
  eventUrl: string;
  groupName?: string | null;
  inviteCode?: string | null;
  signupUrl?: string | null;
};

export function gameNightEventUrl(origin: string, gameNightId: string): string {
  return `${origin.replace(/\/$/, "")}/game-nights/${gameNightId}`;
}

export function gameNightShareTitle(title: string): string {
  return `${title} — game night`;
}

export function buildGameNightShareMessage(input: GameNightShareInput): string {
  const lines = [input.title.trim(), input.when.trim()];

  if (input.location?.trim()) {
    lines.push(`At ${input.location.trim()}`);
  }
  if (input.hostName?.trim()) {
    lines.push(`Hosted by ${input.hostName.trim()}`);
  }
  if (input.gameTitles && input.gameTitles.length > 0) {
    lines.push(`Games: ${input.gameTitles.join(", ")}`);
  }

  lines.push("", `RSVP: ${input.eventUrl}`);

  if (input.groupName?.trim() && input.inviteCode?.trim()) {
    lines.push(
      "",
      `Not in the group yet? Join "${input.groupName.trim()}" with invite code ${input.inviteCode.trim()}.`
    );
    if (input.signupUrl?.trim()) {
      lines.push(`Sign up: ${input.signupUrl.trim()}`);
    }
  }

  return lines.join("\n");
}
