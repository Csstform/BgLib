import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGroupMember } from "@/lib/group";
import { buildIcsCalendar } from "@/lib/ics";
import { gameNightToIcsEvent } from "@/lib/game-night-calendar";
import { loadGroupGameNightsForCalendar } from "@/lib/load-game-night-calendar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: night } = await supabase
    .from("game_nights")
    .select("id, group_id, title")
    .eq("id", id)
    .single();

  if (!night?.group_id || !(await isGroupMember(night.group_id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nights = await loadGroupGameNightsForCalendar(night.group_id, {
    upcomingOnly: false,
    nightId: id,
  });

  const calendarNight = nights[0];
  if (!calendarNight) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const event = gameNightToIcsEvent(calendarNight, appUrl);
  const ics = buildIcsCalendar([event], calendarNight.title);
  const filename = `${calendarNight.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "game-night"}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
