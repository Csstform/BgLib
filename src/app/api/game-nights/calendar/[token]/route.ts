import { NextRequest } from "next/server";
import {
  calendarFeedResponseForToken,
  emptyIcsHeadResponse,
} from "@/lib/calendar-feed-response";

async function handle(
  request: NextRequest,
  params: Promise<{ token: string }>
) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  return calendarFeedResponseForToken(token, appUrl);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handle(request, params);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return emptyIcsHeadResponse(await handle(request, params));
}
