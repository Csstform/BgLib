import { NextRequest, NextResponse } from "next/server";
import { searchBggGames } from "@/lib/bgg";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchBggGames(query);
    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "BGG search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
