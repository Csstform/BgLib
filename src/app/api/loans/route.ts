import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { notifyUsersWithEmail } from "@/lib/push";

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
  const { game_id, lender_id, due_date, notes } = body;

  if (!game_id || !lender_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (lender_id === user.id) {
    return NextResponse.json({ error: "Cannot borrow from yourself" }, { status: 400 });
  }

  const { data: game } = await supabase
    .from("games")
    .select("title, group_id")
    .eq("id", game_id)
    .single();

  if (!game || game.group_id !== groupId) {
    return NextResponse.json({ error: "Game not in your group" }, { status: 404 });
  }

  const { data: ownership } = await supabase
    .from("ownership")
    .select("id")
    .eq("game_id", game_id)
    .eq("user_id", lender_id)
    .single();

  if (!ownership) {
    return NextResponse.json({ error: "Lender does not own this game" }, { status: 400 });
  }

  const { data: borrower } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: loan, error } = await supabase
    .from("loans")
    .insert({
      game_id,
      lender_id,
      borrower_id: user.id,
      status: "pending",
      due_date: due_date || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyUsersWithEmail([lender_id], {
    title: "Loan request",
    body: `${borrower?.display_name ?? "Someone"} wants to borrow ${game.title}`,
    url: "/loans",
  });

  return NextResponse.json(loan);
}
