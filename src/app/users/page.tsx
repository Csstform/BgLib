import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import {
  getActiveGroupId,
  getGroupMembers,
  getMyGroupRole,
} from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCard } from "@/components/UserCard";

export default async function UsersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [members, myRole] = await Promise.all([
    getGroupMembers(groupId),
    getMyGroupRole(groupId),
  ]);

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

  const canRemove = myRole === "owner";

  return (
    <div className="page-shell">
      <PageHeader
        title="Players"
        subtitle="Members of your active group"
        action={
          <Link
            href="/profile#group"
            className="text-sm text-primary hover:underline"
          >
            Group settings
          </Link>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players yet"
          description="Share your group's invite code so friends can join."
          action={{ href: "/profile#group", label: "View invite code" }}
        />
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <UserCard
              key={member.user_id}
              profile={member.profile}
              gameCount={countMap.get(member.user_id) ?? 0}
              role={member.role}
              groupId={groupId}
              currentUserId={user?.id}
              canRemove={canRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
