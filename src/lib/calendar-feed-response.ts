import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { parseCalendarFeedToken } from "@/lib/calendar-feed";
import { gameNightsToIcs } from "@/lib/game-night-calendar";
import {
  canAccessGroupCalendar,
  loadGroupGameNightsForCalendar,
} from "@/lib/load-game-night-calendar";

const ICS_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": 'inline; filename="bglib-game-nights.ics"',
  "Cache-Control": "max-age=300",
};

export function normalizeCalendarFeedToken(raw: string): string {
  return decodeURIComponent(raw).replace(/\.ics$/i, "");
}

export function icsFeedResponse(ics: string): NextResponse {
  return new NextResponse(ics, { headers: ICS_HEADERS });
}

export async function calendarFeedResponseForToken(
  token: string,
  appUrl: string
): Promise<NextResponse> {
  const parsed = parseCalendarFeedToken(normalizeCalendarFeedToken(token));
  if (!parsed) {
    return NextResponse.json({ error: "Invalid calendar token" }, { status: 401 });
  }

  const allowed = await canAccessGroupCalendar(parsed.groupId, parsed.userId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nights = await loadGroupGameNightsForCalendar(parsed.groupId, {
    upcomingOnly: true,
    supabase: getAdminClient(),
  });

  return icsFeedResponse(
    gameNightsToIcs(nights, "BgLib Game Nights", appUrl)
  );
}

export function emptyIcsHeadResponse(from: NextResponse): NextResponse {
  return new NextResponse(null, {
    status: from.status,
    headers: from.headers,
  });
}
