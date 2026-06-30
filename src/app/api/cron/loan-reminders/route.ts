import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";
import { sendEmailToUsers } from "@/lib/email";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required for cron" },
      { status: 500 }
    );
  }

  const supabase = getAdminClient();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const { data: dueLoans } = await supabase
    .from("loans")
    .select(
      `
      id, due_date, borrower_id, lender_id, reminder_sent_at,
      game:games (title),
      borrower:profiles!loans_borrower_id_fkey (display_name),
      lender:profiles!loans_lender_id_fkey (display_name)
    `
    )
    .eq("status", "active")
    .lte("due_date", tomorrowStr)
    .gte("due_date", todayStr)
    .is("reminder_sent_at", null);

  let reminded = 0;

  for (const loan of dueLoans ?? []) {
    const gameTitle = (Array.isArray(loan.game) ? loan.game[0] : loan.game)?.title ?? "a game";
    const borrowerName = (Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower)?.display_name;
    const isOverdue = loan.due_date < todayStr;
    const title = isOverdue ? "Loan overdue" : "Loan due tomorrow";
    const body = isOverdue
      ? `${borrowerName ?? "Borrower"}'s copy of ${gameTitle} was due ${loan.due_date}`
      : `Reminder: ${gameTitle} is due back on ${loan.due_date}`;

    const userIds = [loan.borrower_id, loan.lender_id];

    await sendPushToUsers(userIds, { title, body, url: "/loans" });
    await sendEmailToUsers(
      userIds,
      title,
      `<p>${body}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/loans">View loans in BgLib</a></p>`
    );

    await supabase
      .from("loans")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", loan.id);

    reminded++;
  }

  return NextResponse.json({ reminded });
}
