import { NextResponse } from "next/server";
import { isGameUpcConfigured } from "@/lib/gameupc";

export async function GET() {
  return NextResponse.json({ configured: isGameUpcConfigured() });
}
