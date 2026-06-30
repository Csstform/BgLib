import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { game_id, lender_id, due_date, notes } = body;

  if (!game_id || !lender_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: game } = await supabase
    .from("games")
    .select("title")
    .eq("id", game_id)
    .single();

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

  await sendPushToUsers([lender_id], {
    title: "Loan request",
    body: `${borrower?.display_name ?? "Someone"} wants to borrow ${game?.title ?? "a game"}`,
    url: "/loans",
  });

  return NextResponse.json(loan);
}
