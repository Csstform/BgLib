import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyGroupMembers } from "@/lib/push";
import { formatDateTime } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
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

  const body = await request.json();
  const { cancelled } = body;

  const { data: night } = await supabase
    .from("game_nights")
    .select("*")
    .eq("id", id)
    .single();

  if (!night || night.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cancelled) {
    await supabase
      .from("game_nights")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", id);

    if (night.group_id) {
      await notifyGroupMembers(night.group_id, user.id, {
        title: "Game night cancelled",
        body: `"${night.title}" has been cancelled`,
        url: "/game-nights",
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: NextRequest,
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

  const body = await request.json();
  const { title, description, scheduled_at, location } = body;

  const { data: night } = await supabase
    .from("game_nights")
    .select("*")
    .eq("id", id)
    .single();

  if (!night || night.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase
    .from("game_nights")
    .update({
      title: title?.trim() ?? night.title,
      description: description?.trim() ?? night.description,
      scheduled_at: scheduled_at ?? night.scheduled_at,
      location: location?.trim() ?? night.location,
    })
    .eq("id", id);

  if (night.group_id) {
    await notifyGroupMembers(night.group_id, user.id, {
      title: "Game night updated",
      body: `"${title ?? night.title}" — ${formatDateTime(scheduled_at ?? night.scheduled_at)}`,
      url: `/game-nights/${id}`,
    });
  }

  return NextResponse.json({ ok: true });
}
