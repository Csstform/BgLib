import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmailToUsers } from "@/lib/email";
import {
  buildGameNightInviteEmail,
  type GameNightInviteContent,
} from "@/lib/game-night-email";
import { buildIcsCalendar } from "@/lib/ics";
import { gameNightToIcsEvent } from "@/lib/game-night-calendar";

export async function sendGameNightInviteToGroup(input: {
  groupId: string;
  excludeUserId: string;
  night: {
    id: string;
    title: string;
    scheduled_at: string;
    location?: string | null;
    description?: string | null;
    host_name: string;
    game_titles?: string[];
  };
}): Promise<number> {
  const supabase = getAdminClient();
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", input.groupId);

  const userIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== input.excludeUserId);

  if (userIds.length === 0) return 0;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const eventUrl = `${appUrl}/game-nights/${input.night.id}`;
  const invite: GameNightInviteContent = {
    title: input.night.title,
    scheduledAtIso: input.night.scheduled_at,
    location: input.night.location,
    hostName: input.night.host_name,
    description: input.night.description,
    gameTitles: input.night.game_titles,
    eventUrl,
  };
  const { subject, html } = buildGameNightInviteEmail(invite);
  const ics = buildIcsCalendar(
    [gameNightToIcsEvent({ ...input.night, host_name: input.night.host_name }, appUrl)],
    input.night.title
  );

  return sendEmailToUsers(userIds, subject, html, {
    attachments: [
      {
        filename: "game-night.ics",
        content: Buffer.from(ics, "utf8"),
        contentType: "text/calendar; charset=utf-8",
      },
    ],
  });
}
