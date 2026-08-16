import { redirect } from "next/navigation";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StartPlayerRandomizer } from "@/components/StartPlayerRandomizer";
import { PickerClient } from "./PickerClient";

export default async function PickerPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const members = await getGroupMembers(groupId);

  const startPlayers = members.map((m) => ({
    id: m.user_id,
    name: m.profile.display_name,
    avatar_url: m.profile.avatar_url,
  }));

  return (
    <div className="page-shell">
      <PageHeader
        title="Game Picker"
        subtitle="Pick a game and who goes first"
      />
      <div className="space-y-6">
        <StartPlayerRandomizer
          key={startPlayers.map((p) => p.id).join(",")}
          players={startPlayers}
        />
        <PickerClient members={members} />
      </div>
    </div>
  );
}
