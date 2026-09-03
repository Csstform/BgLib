import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import {
  normalizePlayParticipantInputs,
  playParticipantRowsFromInput,
  type PlayParticipantInput,
} from "@/lib/play-participant";

async function validatePlayInput(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  gameId: string,
  playedAt: string,
  participants: PlayParticipantInput[],
  expansionIds: string[]
) {
  const playedDate = new Date(playedAt);
  if (Number.isNaN(playedDate.getTime())) {
    return { error: "Invalid date", status: 400 as const };
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, group_id, base_game_id")
    .eq("id", gameId)
    .single();

  if (!game || game.group_id !== groupId) {
    return { error: "Game not found in this group", status: 404 as const };
  }

  if (game.base_game_id) {
    return {
      error: "Select the base game and choose expansions below",
      status: 400 as const,
    };
  }

  const { members } = normalizePlayParticipantInputs(participants);
  const participantIds = members
    .map((p) => p.user_id)
    .filter((id): id is string => !!id);

  if (participantIds.length > 0) {
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", participantIds);

    const memberIds = new Set((memberRows ?? []).map((m) => m.user_id));
    if (participantIds.some((id) => !memberIds.has(id))) {
      return {
        error: "All players must be members of this group",
        status: 400 as const,
      };
    }
  }

  const uniqueExpansionIds = [...new Set(expansionIds)].filter(Boolean);
  if (uniqueExpansionIds.length > 0) {
    const { data: expansions } = await supabase
      .from("games")
      .select("id, base_game_id")
      .eq("group_id", groupId)
      .in("id", uniqueExpansionIds);

    if (
      !expansions ||
      expansions.length !== uniqueExpansionIds.length ||
      expansions.some((exp) => exp.base_game_id !== gameId)
    ) {
      return {
        error: "One or more expansions are invalid for this game",
        status: 400 as const,
      };
    }
  }

  return {
    playedDate,
    participantIds,
    uniqueExpansionIds,
  };
}

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

  const groupId = await getActiveGroupId();
  if (!groupId) {
    return NextResponse.json({ error: "No active group" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("plays")
    .select("id, group_id, logged_by")
    .eq("id", id)
    .single();

  if (!existing || existing.group_id !== groupId) {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  if (existing.logged_by !== user.id) {
    return NextResponse.json(
      { error: "Only the person who logged this play can edit it" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    game_id: gameId,
    played_at: playedAt,
    duration_minutes: durationMinutes,
    notes,
    first_time_played: firstTimePlayed,
    participants = [],
    expansion_ids: expansionIds = [],
  } = body as {
    game_id?: string;
    played_at?: string;
    duration_minutes?: number | null;
    notes?: string | null;
    first_time_played?: boolean;
    participants?: PlayParticipantInput[];
    expansion_ids?: string[];
  };

  if (!gameId || !playedAt) {
    return NextResponse.json(
      { error: "Game and date are required" },
      { status: 400 }
    );
  }

  const validation = await validatePlayInput(
    supabase,
    groupId,
    gameId,
    playedAt,
    participants,
    expansionIds
  );

  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const { playedDate, uniqueExpansionIds } = validation;

  const { error: playError } = await supabase
    .from("plays")
    .update({
      game_id: gameId,
      played_at: playedDate.toISOString(),
      duration_minutes:
        durationMinutes != null && Number.isFinite(durationMinutes)
          ? durationMinutes
          : null,
      notes: notes?.trim() || null,
      first_time_played: !!firstTimePlayed,
    })
    .eq("id", id);

  if (playError) {
    return NextResponse.json({ error: playError.message }, { status: 500 });
  }

  await supabase.from("play_participants").delete().eq("play_id", id);
  await supabase.from("play_expansions").delete().eq("play_id", id);

  const participantRows = playParticipantRowsFromInput(id, participants);
  if (participantRows.length > 0) {
    const { error: participantError } = await supabase
      .from("play_participants")
      .insert(participantRows);

    if (participantError) {
      const message = participantError.message;
      if (message.includes("guest_name") || message.includes("player_check")) {
        return NextResponse.json(
          {
            error:
              "Database is missing guest player columns. Run migration 015_weight_and_guest_players.sql in Supabase.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (uniqueExpansionIds.length > 0) {
    const { error: expansionError } = await supabase
      .from("play_expansions")
      .insert(
        uniqueExpansionIds.map((expId) => ({
          play_id: id,
          game_id: expId,
        }))
      );

    if (expansionError) {
      return NextResponse.json(
        { error: expansionError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id });
}
