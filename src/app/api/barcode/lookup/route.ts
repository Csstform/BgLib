import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { normalizeBarcode } from "@/lib/barcode";
import { isGameUpcConfigured, lookupUpcOnGameUpc } from "@/lib/gameupc";

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
    });
  }

  if (!isGameUpcConfigured()) {
    return NextResponse.json(
      {
        error:
          "Barcode lookup is not configured. Set GAMEUPC_API_TOKEN in .env.local (register at https://gameupc.com), or search BGG manually.",
        upc,
        configured: false,
      },
      { status: 503 }
    );
  }

  try {
    const result = await lookupUpcOnGameUpc(upc);

    if (!result || (!result.bggId && result.candidates.length === 0)) {
      return NextResponse.json(
        {
          upc,
          found: false,
          message:
            "No game found for this barcode. Try searching BGG by name instead.",
        },
        { status: 404 }
      );
    }

    if (result.bggId) {
      await supabase.from("upc_bgg_mappings").upsert(
        {
          upc,
          bgg_id: result.bggId,
          title: result.name ?? null,
          source: "gameupc",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "upc" }
      );
    }

    return NextResponse.json({
      upc,
      source: "gameupc",
      found: true,
      bggId: result.bggId,
      name: result.name,
      status: result.status,
      candidates: result.candidates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Barcode lookup failed";
    return NextResponse.json({ error: message, upc }, { status: 502 });
  }
}
