import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBarcode } from "@/lib/barcode";

/** Save a user-confirmed UPC → BGG mapping for future scans. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const upc = normalizeBarcode(String(body.upc ?? ""));
  const bggId = parseInt(String(body.bggId ?? ""), 10);
  const title = typeof body.title === "string" ? body.title.trim() : null;

  if (!upc || !bggId || Number.isNaN(bggId)) {
    return NextResponse.json({ error: "Invalid UPC or BGG ID" }, { status: 400 });
  }

  const { error } = await supabase.from("upc_bgg_mappings").upsert(
    {
      upc,
      bgg_id: bggId,
      title,
      source: "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "upc" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upc, bggId });
}
