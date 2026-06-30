import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUsersWithEmail } from "@/lib/push";

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
  const { status } = body;

  const { data: loan } = await supabase
    .from("loans")
    .select(
      `
      *,
      game:games (title),
      lender:profiles!loans_lender_id_fkey (display_name),
      borrower:profiles!loans_borrower_id_fkey (display_name)
    `
    )
    .eq("id", id)
    .single();

  if (!loan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (loan.lender_id !== user.id && loan.borrower_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "active") updates.borrowed_at = new Date().toISOString();
  if (status === "returned") updates.returned_at = new Date().toISOString();

  const { error } = await supabase.from("loans").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gameTitle = (Array.isArray(loan.game) ? loan.game[0] : loan.game)?.title ?? "a game";
  const lenderName = (Array.isArray(loan.lender) ? loan.lender[0] : loan.lender)?.display_name;
  const borrowerName = (Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower)?.display_name;

  if (status === "active" && loan.borrower_id) {
    await notifyUsersWithEmail([loan.borrower_id], {
      title: "Loan approved",
      body: `${lenderName ?? "The owner"} approved your borrow request for ${gameTitle}`,
      url: "/loans",
    });
  } else if (status === "declined" && loan.borrower_id) {
    await notifyUsersWithEmail([loan.borrower_id], {
      title: "Loan declined",
      body: `Your request to borrow ${gameTitle} was declined`,
      url: "/loans",
    });
  } else if (status === "returned") {
    const notifyId =
      user.id === loan.borrower_id ? loan.lender_id : loan.borrower_id;
    const who = user.id === loan.borrower_id ? borrowerName : lenderName;
    await notifyUsersWithEmail([notifyId], {
      title: "Game returned",
      body: `${who ?? "Someone"} marked ${gameTitle} as returned`,
      url: "/loans",
    });
  }

  return NextResponse.json({ ok: true });
}
