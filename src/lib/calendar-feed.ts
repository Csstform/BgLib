import { createHmac, timingSafeEqual } from "crypto";

function getCalendarFeedSecret(): string {
  return (
    process.env.CALENDAR_FEED_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bglib-local-dev-calendar-feed"
  );
}

function sign(userId: string, groupId: string): string {
  return createHmac("sha256", getCalendarFeedSecret())
    .update(`${userId}:${groupId}`)
    .digest("base64url");
}

export function createCalendarFeedToken(
  userId: string,
  groupId: string
): string {
  const payload = `${userId}:${groupId}:${sign(userId, groupId)}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function parseCalendarFeedToken(
  token: string
): { userId: string; groupId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, groupId, signature] = decoded.split(":");
    if (!userId || !groupId || !signature) return null;

    const expected = sign(userId, groupId);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { userId, groupId };
  } catch {
    return null;
  }
}

