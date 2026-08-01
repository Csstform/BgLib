import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const { data: play } = await supabase
    .from("plays")
    .select("id, group_id, logged_by")
    .eq("id", id)
    .single();

  if (!play || play.group_id !== groupId) {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  if (play.logged_by !== user.id) {
    return NextResponse.json(
      { error: "Only the person who logged this play can delete it" },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("plays").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
