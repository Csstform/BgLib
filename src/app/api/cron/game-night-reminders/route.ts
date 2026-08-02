import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";
import { sendEmailToUsers } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required for cron" },
      { status: 500 }
    );
  }

  const supabase = getAdminClient();
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: upcomingNights } = await supabase
    .from("game_nights")
    .select(
      `
      id, title, scheduled_at, location, group_id,
      rsvps:game_night_rsvps (user_id, status)
    `
    )
    .is("cancelled_at", null)
    .is("reminder_sent_at", null)
    .gte("scheduled_at", tomorrowStart.toISOString())
    .lte("scheduled_at", tomorrowEnd.toISOString());

  let reminded = 0;

  for (const night of upcomingNights ?? []) {
    if (!night.group_id) continue;

    const rsvps = (night.rsvps ?? []) as {
      user_id: string;
      status: string;
    }[];

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", night.group_id);

    const declined = new Set(
      rsvps.filter((r) => r.status === "declined").map((r) => r.user_id)
    );

    const userIds = (members ?? [])
      .map((m) => m.user_id)
      .filter((id) => !declined.has(id));

    if (userIds.length === 0) continue;

    const when = formatDateTime(night.scheduled_at);
    const title = "Game night tomorrow";
    const location = night.location ? ` at ${night.location}` : "";
    const body = `"${night.title}" is tomorrow (${when})${location}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    await sendPushToUsers(userIds, {
      title,
      body,
      url: `/game-nights/${night.id}`,
    });
    await sendEmailToUsers(
      userIds,
      title,
      `<p>${body}</p><p><a href="${appUrl}/game-nights/${night.id}">View game night in BgLib</a></p>`
    );

    await supabase
      .from("game_nights")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", night.id);

    reminded++;
  }

  return NextResponse.json({ reminded });
}
