import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getUserGroups } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameNightForm } from "@/components/GameNightForm";
import { ActiveGroupBanner } from "@/components/ActiveGroupBanner";
import { isEmailConfigured } from "@/lib/email";

export default async function NewGameNightPage() {
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

  const groups = await getUserGroups();
  const activeGroup = groups.find((g) => g.id === groupId);

  const { data: games } = await supabase
    .from("games")
    .select("id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at")
    .eq("group_id", groupId)
    .order("title");

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-bold">Plan a Game Night</h1>
      <ActiveGroupBanner
        groupName={activeGroup?.name ?? "your group"}
        action="This night will be planned in"
      />
      <GameNightForm games={games ?? []} emailConfigured={isEmailConfigured()} />
    </div>
  );
}
