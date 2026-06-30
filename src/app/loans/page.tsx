import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { LoanCard } from "@/components/LoanCard";
import type { LoanWithDetails } from "@/lib/types";

export default async function LoansPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: loans } = await supabase
    .from("loans")
    .select(
      `
      *,
      game:games (id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at),
      lender:profiles!loans_lender_id_fkey (id, display_name, avatar_url, bio, created_at),
      borrower:profiles!loans_borrower_id_fkey (id, display_name, avatar_url, bio, created_at)
    `
    )
    .or(`lender_id.eq.${user.id},borrower_id.eq.${user.id}`)
    .neq("status", "returned")
    .neq("status", "cancelled")
    .neq("status", "declined")
    .order("created_at", { ascending: false });

  const loansWithDetails: LoanWithDetails[] = (loans ?? []).map((l) => ({
    ...l,
    game: Array.isArray(l.game) ? l.game[0] : l.game,
    lender: Array.isArray(l.lender) ? l.lender[0] : l.lender,
    borrower: Array.isArray(l.borrower) ? l.borrower[0] : l.borrower,
  }));

  const lent = loansWithDetails.filter((l) => l.lender_id === user.id);
  const borrowed = loansWithDetails.filter((l) => l.borrower_id === user.id);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">Loans</h1>
      <p className="text-sm text-muted mb-6">
        Track games you&apos;ve lent or borrowed
      </p>

      {loansWithDetails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-2">No active loans.</p>
          <p className="text-sm text-muted">
            Visit a game in the library and tap &quot;Borrow&quot; on an
            owner&apos;s name to request a loan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {borrowed.length > 0 && (
            <section>
              <h2 className="font-semibold mb-2 text-sm text-muted uppercase tracking-wide">
                Borrowed ({borrowed.length})
              </h2>
              <div className="space-y-2">
                {borrowed.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} currentUserId={user.id} />
                ))}
              </div>
            </section>
          )}
          {lent.length > 0 && (
            <section>
              <h2 className="font-semibold mb-2 text-sm text-muted uppercase tracking-wide">
                Lent out ({lent.length})
              </h2>
              <div className="space-y-2">
                {lent.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} currentUserId={user.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
