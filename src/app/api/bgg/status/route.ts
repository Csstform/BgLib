import { NextResponse } from "next/server";
import { isBggConfigured } from "@/lib/bgg";

export async function GET() {
  return NextResponse.json({ configured: isBggConfigured() });
}
