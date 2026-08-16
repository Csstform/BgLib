import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getGroupGameIds } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoanCard } from "@/components/LoanCard";
import { PackageOpen } from "lucide-react";
import type { LoanWithDetails } from "@/lib/types";

export default async function LoansPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const gameIds = await getGroupGameIds(groupId);

  const { data: loans } =
    gameIds.length > 0
      ? await supabase
          .from("loans")
          .select(
            `
      *,
      game:games (id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at, group_id),
      lender:profiles!loans_lender_id_fkey (id, display_name, avatar_url, bio, created_at),
      borrower:profiles!loans_borrower_id_fkey (id, display_name, avatar_url, bio, created_at)
    `
          )
          .or(`lender_id.eq.${user.id},borrower_id.eq.${user.id}`)
          .in("game_id", gameIds)
          .neq("status", "returned")
          .neq("status", "cancelled")
          .neq("status", "declined")
          .order("created_at", { ascending: false })
      : { data: [] };

  const loansWithDetails: LoanWithDetails[] = (loans ?? []).map((l) => ({
    ...l,
    game: Array.isArray(l.game) ? l.game[0] : l.game,
    lender: Array.isArray(l.lender) ? l.lender[0] : l.lender,
    borrower: Array.isArray(l.borrower) ? l.borrower[0] : l.borrower,
  }));

  const lent = loansWithDetails.filter((l) => l.lender_id === user.id);
  const borrowed = loansWithDetails.filter((l) => l.borrower_id === user.id);

  return (
    <div className="page-shell">
      <PageHeader
        title="Loans"
        subtitle="Games lent or borrowed in this group"
      />

      {loansWithDetails.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No active loans"
          description="Visit a game in the library and tap Borrow on an owner's name to request a loan."
        />
      ) : (
        <div className="space-y-6">
          {borrowed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
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
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
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
