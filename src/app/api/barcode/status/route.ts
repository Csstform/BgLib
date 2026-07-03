import { NextResponse } from "next/server";
import { isBggConfigured } from "@/lib/bgg";
import { isGameUpcConfigured } from "@/lib/gameupc";

export async function GET() {
  return NextResponse.json({
    /** Barcode scan works without GameUPC when BGG is configured. */
    configured: isBggConfigured(),
    bggConfigured: isBggConfigured(),
    gameUpcConfigured: isGameUpcConfigured(),
    mode: isGameUpcConfigured() ? "gameupc+bgg" : "bgg_search",
  });
}
