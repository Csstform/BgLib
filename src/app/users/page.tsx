import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
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

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at")
    .order("display_name");

  const { data: ownershipCounts } = await supabase
    .from("ownership")
    .select("user_id");

  const countMap = new Map<string, number>();
  (ownershipCounts ?? []).forEach((o: { user_id: string }) => {
    countMap.set(o.user_id, (countMap.get(o.user_id) ?? 0) + 1);
  });

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">Players</h1>
      <p className="text-sm text-muted mb-6">
        See who owns what in your group
      </p>

      {(profiles ?? []).length === 0 ? (
        <p className="text-center text-muted py-8">No players yet.</p>
      ) : (
        <div className="space-y-2">
          {(profiles ?? []).map((profile) => (
            <UserCard
              key={profile.id}
              profile={profile}
              gameCount={countMap.get(profile.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
