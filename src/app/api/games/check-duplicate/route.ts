import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";

export async function GET(request: NextRequest) {
  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ duplicates: [] });
  }

  const bggId = request.nextUrl.searchParams.get("bgg_id");
  const title = request.nextUrl.searchParams.get("title");
  const upc = request.nextUrl.searchParams.get("upc");

  if (!bggId && !title && !upc) {
    return NextResponse.json({ duplicates: [] });
  }

  const supabase = await createClient();
  const duplicates: { id: string; title: string; bgg_id: number | null; match_type: string }[] = [];

  if (bggId) {
    const { data } = await supabase
      .from("games")
      .select("id, title, bgg_id")
      .eq("group_id", groupId)
      .eq("bgg_id", parseInt(bggId, 10));

    (data ?? []).forEach((g) =>
      duplicates.push({ ...g, match_type: "bgg_id" })
    );
  }

  if (upc) {
    const { data } = await supabase
      .from("games")
      .select("id, title, bgg_id")
      .eq("group_id", groupId)
      .eq("upc", upc);

    (data ?? []).forEach((g) => {
      if (!duplicates.some((d) => d.id === g.id)) {
        duplicates.push({ ...g, match_type: "upc" });
      }
    });
  }

  if (title && title.trim().length >= 3) {
    const { data } = await supabase
      .from("games")
      .select("id, title, bgg_id")
      .eq("group_id", groupId)
      .ilike("title", title.trim());

    (data ?? []).forEach((g) => {
      if (!duplicates.some((d) => d.id === g.id)) {
        duplicates.push({ ...g, match_type: "title" });
      }
    });
  }

  return NextResponse.json({ duplicates });
}
