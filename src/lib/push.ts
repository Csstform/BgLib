import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function getVapidConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  if (!getVapidConfigured() || userIds.length === 0) return 0;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@bglib.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = getAdminClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (!subscriptions?.length) return 0;

  const message = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    })
  );

  return sent;
}

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string | null,
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  const supabase = getAdminClient();
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const userIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== excludeUserId);

  return sendPushToUsers(userIds, payload);
}

export async function notifyAllUsersExcept(
  excludeUserId: string,
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  const supabase = getAdminClient();
  const { data: profiles } = await supabase.from("profiles").select("id");

  const userIds = (profiles ?? [])
    .map((p) => p.id)
    .filter((id) => id !== excludeUserId);

  return sendPushToUsers(userIds, payload);
}

export function isPushConfigured(): boolean {
  return getVapidConfigured();
}
