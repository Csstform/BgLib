import {
  buildIcsCalendar,
  defaultGameNightEnd,
  type IcsEvent,
} from "@/lib/ics";

export type GameNightCalendarInput = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  scheduled_at: string;
  host_name?: string;
  game_titles?: string[];
};

export function gameNightToIcsEvent(
  night: GameNightCalendarInput,
  appUrl: string
): IcsEvent {
  const start = new Date(night.scheduled_at);
  const details: string[] = [];

  if (night.description) details.push(night.description);
  if (night.host_name) details.push(`Hosted by ${night.host_name}`);
  if (night.game_titles && night.game_titles.length > 0) {
    details.push(`Planned games: ${night.game_titles.join(", ")}`);
  }
  details.push(`${appUrl}/game-nights/${night.id}`);

  return {
    uid: `game-night-${night.id}@bglib`,
    title: night.title,
    description: details.join("\n\n"),
    location: night.location,
    start,
    end: defaultGameNightEnd(start),
    url: `${appUrl}/game-nights/${night.id}`,
  };
}

export function gameNightsToIcs(
  nights: GameNightCalendarInput[],
  calendarName: string,
  appUrl: string
): string {
  const events = nights.map((night) => gameNightToIcsEvent(night, appUrl));
  return buildIcsCalendar(events, calendarName);
}
