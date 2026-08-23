export function buildCalendarFeedUrl(token: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  const httpUrl = `${base}/api/game-nights/calendar?token=${encodeURIComponent(token)}`;
  return httpUrl.replace(/^https?:\/\//, "webcal://");
}
