import { Resend } from "resend";
import { getAdminClient } from "@/lib/supabase/admin";

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function getUserEmail(userId: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = getAdminClient();
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

export async function sendEmailToUsers(
  userIds: string[],
  subject: string,
  html: string
): Promise<number> {
  if (!isEmailConfigured() || userIds.length === 0) return 0;

  const supabase = getAdminClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email_notifications")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.email_notifications !== false])
  );

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;

  await Promise.all(
    userIds.map(async (userId) => {
      if (profileMap.get(userId) === false) return;
      const email = await getUserEmail(userId);
      if (!email) return;

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject,
          html,
        });
        sent++;
      } catch {
        // Skip failed sends
      }
    })
  );

  return sent;
}

export async function notifyUsers(
  userIds: string[],
  payload: {
    title: string;
    body: string;
    url?: string;
  },
  pushFn: (ids: string[], p: typeof payload) => Promise<number>
): Promise<{ push: number; email: number }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = payload.url ? `${appUrl}${payload.url}` : appUrl;

  const [push, email] = await Promise.all([
    pushFn(userIds, payload),
    sendEmailToUsers(
      userIds,
      payload.title,
      `<p>${payload.body}</p><p><a href="${link}">Open in BgLib</a></p>`
    ),
  ]);

  return { push, email };
}
