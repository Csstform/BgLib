import { redirect } from "next/navigation";
import { Dices } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getOwnedGamesInGroup } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameCard } from "@/components/GameCard";

export default async function CollectionPage() {
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

  const { games, error } = await getOwnedGamesInGroup(user.id, groupId);

  return (
    <div className="page-shell">
      <PageHeader
        title="My Collection"
        subtitle={`${games.length} game${games.length !== 1 ? "s" : ""} you own in this group`}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load your collection: {error}
        </div>
      )}

      {games.length === 0 && !error ? (
        <EmptyState
          icon={Dices}
          title="Your collection is empty"
          description="Mark games you own from the library, or add new ones."
          action={{ href: "/library", label: "Browse the library" }}
        />
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} hideOwners />
          ))}
        </div>
      )}
    </div>
  );
}
