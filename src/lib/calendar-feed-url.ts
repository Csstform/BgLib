export function buildCalendarHttpUrl(token: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/api/game-nights/calendar/${encodeURIComponent(token)}.ics`;
}

export function buildCalendarWebcalUrl(token: string, appUrl: string): string {
  return buildCalendarHttpUrl(token, appUrl).replace(/^https?:\/\//, "webcal://");
}

export function buildGoogleCalendarSubscribeUrl(
  token: string,
  appUrl: string
): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    buildCalendarWebcalUrl(token, appUrl)
  )}`;
}

/** HTTPS ICS URL for calendar apps that subscribe "From URL" (Google Calendar). */
export function buildCalendarFeedUrl(token: string, appUrl: string): string {
  return buildCalendarHttpUrl(token, appUrl);
}
