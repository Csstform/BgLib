import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyGroupMembers } from "@/lib/push";
import { formatDateTime, parseClientIsoDateTime } from "@/lib/utils";

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
  const { title, description, scheduled_at, location, game_ids } = body;

  const { data: night } = await supabase
    .from("game_nights")
    .select("*")
    .eq("id", id)
    .single();

  if (!night || night.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (night.cancelled_at) {
    return NextResponse.json(
      { error: "Cancelled game nights cannot be edited" },
      { status: 400 }
    );
  }

  const nextTitle = typeof title === "string" ? title.trim() : night.title;
  if (!nextTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let scheduledAtIso = night.scheduled_at;
  if (scheduled_at != null) {
    const scheduledDate = parseClientIsoDateTime(scheduled_at);
    if (!scheduledDate) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    scheduledAtIso = scheduledDate.toISOString();
  }

  const { data: updated, error } = await supabase
    .from("game_nights")
    .update({
      title: nextTitle,
      description:
        typeof description === "string"
          ? description.trim() || null
          : night.description,
      scheduled_at: scheduledAtIso,
      location:
        typeof location === "string" ? location.trim() || null : night.location,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(game_ids)) {
    if (!night.group_id) {
      return NextResponse.json(
        { error: "Game night has no group" },
        { status: 400 }
      );
    }

    await supabase.from("game_night_games").delete().eq("game_night_id", id);

    if (game_ids.length > 0) {
      const { data: validGames } = await supabase
        .from("games")
        .select("id")
        .eq("group_id", night.group_id)
        .in("id", game_ids);

      const validIds = new Set((validGames ?? []).map((g) => g.id));
      const filtered = (game_ids as string[]).filter((gameId) =>
        validIds.has(gameId)
      );

      if (filtered.length > 0) {
        await supabase.from("game_night_games").insert(
          filtered.map((game_id: string) => ({
            game_night_id: id,
            game_id,
          }))
        );
      }
    }
  }

  if (night.group_id) {
    await notifyGroupMembers(night.group_id, user.id, {
      title: "Game night updated",
      body: `"${nextTitle}" — ${formatDateTime(scheduledAtIso)}`,
      url: `/game-nights/${id}`,
    });
  }

  return NextResponse.json(updated ?? { ok: true, id });
}
