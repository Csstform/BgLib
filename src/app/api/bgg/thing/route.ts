import { NextRequest, NextResponse } from "next/server";
import { getBggGameDetails } from "@/lib/bgg";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id || isNaN(parseInt(id, 10))) {
    return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
  }

  try {
    const game = await getBggGameDetails(parseInt(id, 10));
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "BGG lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
