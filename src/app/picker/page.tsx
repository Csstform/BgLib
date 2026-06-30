import { redirect } from "next/navigation";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PickerClient } from "./PickerClient";

export default async function PickerPage() {
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

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Game Picker</h1>
      <PickerClient members={members} />
    </div>
  );
}
