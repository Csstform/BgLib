import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { UserCard } from "@/components/UserCard";

export default async function UsersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const members = await getGroupMembers(groupId);
  const supabase = await createClient();

  const { data: groupGames } = await supabase
    .from("games")
    .select("id")
    .eq("group_id", groupId);

  const gameIds = (groupGames ?? []).map((g) => g.id);
  const countMap = new Map<string, number>();

  if (gameIds.length > 0) {
    const { data: ownerships } = await supabase
      .from("ownership")
      .select("user_id")
      .in("game_id", gameIds);

    (ownerships ?? []).forEach((o) => {
      countMap.set(o.user_id, (countMap.get(o.user_id) ?? 0) + 1);
    });
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">Players</h1>
      <p className="text-sm text-muted mb-6">
        Members of your active group
      </p>

      {members.length === 0 ? (
        <p className="text-center text-muted py-8">No players in this group yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <UserCard
              key={member.user_id}
              profile={member.profile}
              gameCount={countMap.get(member.user_id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
