import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";

type ParticipantInput = {
  user_id: string;
  is_winner?: boolean;
  score?: number | null;
};

export async function POST(request: NextRequest) {
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
    participants?: ParticipantInput[];
    expansion_ids?: string[];
  };

  if (!gameId || !playedAt) {
    return NextResponse.json(
      { error: "Game and date are required" },
      { status: 400 }
    );
  }

  const playedDate = new Date(playedAt);
  if (Number.isNaN(playedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, group_id, base_game_id")
    .eq("id", gameId)
    .single();

  if (!game || game.group_id !== groupId) {
    return NextResponse.json({ error: "Game not found in this group" }, { status: 404 });
  }

  if (game.base_game_id) {
    return NextResponse.json(
      { error: "Select the base game and choose expansions below" },
      { status: 400 }
    );
  }

  const participantIds = [
    ...new Set(
      (participants as ParticipantInput[])
        .map((p) => p.user_id)
        .filter(Boolean)
    ),
  ];

  if (participantIds.length > 0) {
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", participantIds);

    const memberIds = new Set((members ?? []).map((m) => m.user_id));
    if (participantIds.some((id) => !memberIds.has(id))) {
      return NextResponse.json(
        { error: "All players must be members of this group" },
        { status: 400 }
      );
    }
  }

  const uniqueExpansionIds = [...new Set(expansionIds as string[])].filter(Boolean);
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
      return NextResponse.json(
        { error: "One or more expansions are invalid for this game" },
        { status: 400 }
      );
    }
  }

  const { data: play, error: playError } = await supabase
    .from("plays")
    .insert({
      group_id: groupId,
      game_id: gameId,
      played_at: playedDate.toISOString(),
      duration_minutes:
        durationMinutes != null && Number.isFinite(durationMinutes)
          ? durationMinutes
          : null,
      notes: notes?.trim() || null,
      logged_by: user.id,
      first_time_played: !!firstTimePlayed,
    })
    .select("id")
    .single();

  if (playError || !play) {
    const message = playError?.message ?? "Failed to log play";
    if (message.includes("first_time_played")) {
      return NextResponse.json(
        {
          error:
            "Database is missing play logging columns. Run migration 010_play_winners_stats.sql in Supabase.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (participantIds.length > 0) {
    const participantRows = participantIds.map((uid) => {
      const input = (participants as ParticipantInput[]).find(
        (p) => p.user_id === uid
      );
      let score: number | null = null;
      if (input?.score != null && Number.isFinite(input.score)) {
        score = input.score;
      }
      return {
        play_id: play.id,
        user_id: uid,
        is_winner: !!input?.is_winner,
        score,
      };
    });

    const { error: participantError } = await supabase
      .from("play_participants")
      .insert(participantRows);

    if (participantError) {
      await supabase.from("plays").delete().eq("id", play.id);
      const message = participantError.message;
      if (message.includes("is_winner") || message.includes("score")) {
        return NextResponse.json(
          {
            error:
              "Database is missing player stats columns. Run migration 010_play_winners_stats.sql in Supabase.",
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
          play_id: play.id,
          game_id: expId,
        }))
      );

    if (expansionError) {
      await supabase.from("play_participants").delete().eq("play_id", play.id);
      await supabase.from("plays").delete().eq("id", play.id);
      return NextResponse.json({ error: expansionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: play.id });
}
