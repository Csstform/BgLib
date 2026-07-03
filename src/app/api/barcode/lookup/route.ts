import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { normalizeBarcode } from "@/lib/barcode";
import { resolveBarcodeToBgg } from "@/lib/barcode-lookup";
import { isBggConfigured } from "@/lib/bgg";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("upc") ?? "";
  const upc = normalizeBarcode(raw);

  if (!upc) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const groupId = await getActiveGroupId();

  if (groupId) {
    const { data: existingGame } = await supabase
      .from("games")
      .select("id, title, bgg_id")
      .eq("group_id", groupId)
      .eq("upc", upc)
      .maybeSingle();

    if (existingGame) {
      return NextResponse.json({
        upc,
        source: "library",
        duplicate: existingGame,
      });
    }
  }

  const { data: cached } = await supabase
    .from("upc_bgg_mappings")
    .select("bgg_id, title, source")
    .eq("upc", upc)
    .maybeSingle();

  if (cached?.bgg_id) {
    return NextResponse.json({
      upc,
      source: "cache",
      bggId: cached.bgg_id,
      name: cached.title ?? undefined,
      candidates: [],
      needsManualSearch: false,
    });
  }

  try {
    const result = await resolveBarcodeToBgg(upc);

    if (result.bggId) {
      await supabase.from("upc_bgg_mappings").upsert(
        {
          upc,
          bgg_id: result.bggId,
          title: result.name ?? result.productName ?? null,
          source: result.source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "upc" }
      );
    }

    return NextResponse.json({
      found: !!(result.bggId || result.candidates.length > 0),
      bggConfigured: isBggConfigured(),
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Barcode lookup failed";
    return NextResponse.json({ error: message, upc }, { status: 502 });
  }
}
