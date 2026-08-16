import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
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

  return (
    <div className="page-shell">
      <PageHeader
        title="Game Picker"
        subtitle="Find something to play from your group's library"
      />
      <PickerClient members={members} />
    </div>
  );
}
