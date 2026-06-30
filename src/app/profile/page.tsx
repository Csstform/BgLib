import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { ProfileForm } from "./ProfileForm";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { EmailNotificationToggle } from "@/components/EmailNotificationToggle";
import { GroupInviteCard } from "@/components/GroupInviteCard";
import { BggCollectionImport } from "@/components/BggCollectionImport";
import { isEmailConfigured } from "@/lib/email";

export default async function ProfilePage() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const groupId = await getActiveGroupId();
  let activeGroup = null;
  if (groupId) {
    const { data } = await supabase
      .from("groups")
      .select("id, name, invite_code")
      .eq("id", groupId)
      .single();
    activeGroup = data;
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">My Profile</h1>
      <p className="text-sm text-muted mb-6">{user.email}</p>
      <div className="space-y-6">
        {activeGroup && (
          <GroupInviteCard name={activeGroup.name} inviteCode={activeGroup.invite_code} />
        )}
        <BggCollectionImport />
        <PushNotificationToggle />
        {isEmailConfigured() && (
          <EmailNotificationToggle
            enabled={profile.email_notifications !== false}
            userId={user.id}
          />
        )}
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
