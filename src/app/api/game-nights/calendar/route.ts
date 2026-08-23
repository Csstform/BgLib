import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { parseCalendarFeedToken } from "@/lib/calendar-feed";
import { gameNightsToIcs } from "@/lib/game-night-calendar";
import {
  canAccessGroupCalendar,
  loadGroupGameNightsForCalendar,
} from "@/lib/load-game-night-calendar";

function calendarResponse(ics: string, filename: string) {
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token");

  let groupId: string | null = null;
  let userId: string | undefined;

  if (token) {
    const parsed = parseCalendarFeedToken(token);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid calendar token" }, { status: 401 });
    }

    const allowed = await canAccessGroupCalendar(parsed.groupId, parsed.userId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    groupId = parsed.groupId;
    userId = parsed.userId;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    groupId = await getActiveGroupId();
    if (!groupId) {
      return NextResponse.json({ error: "No active group" }, { status: 400 });
    }
  }

  const nights = await loadGroupGameNightsForCalendar(groupId, {
    upcomingOnly: true,
  });

  const ics = gameNightsToIcs(nights, "BgLib Game Nights", appUrl);
  const filename = token ? "bglib-game-nights.ics" : "bglib-upcoming-game-nights.ics";

  if (token) {
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  return calendarResponse(ics, filename);
}
