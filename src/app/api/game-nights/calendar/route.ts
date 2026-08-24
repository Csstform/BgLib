import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { gameNightsToIcs } from "@/lib/game-night-calendar";
import { loadGroupGameNightsForCalendar } from "@/lib/load-game-night-calendar";
import {
  calendarFeedResponseForToken,
  emptyIcsHeadResponse,
} from "@/lib/calendar-feed-response";

function downloadResponse(ics: string, filename: string) {
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

async function handle(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token");

  if (token) {
    return calendarFeedResponseForToken(token, appUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const nights = await loadGroupGameNightsForCalendar(groupId, {
    upcomingOnly: true,
  });

  return downloadResponse(
    gameNightsToIcs(nights, "BgLib Game Nights", appUrl),
    "bglib-upcoming-game-nights.ics"
  );
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function HEAD(request: NextRequest) {
  return emptyIcsHeadResponse(await handle(request));
}
