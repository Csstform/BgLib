import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "./ProfileForm";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { EmailNotificationToggle } from "@/components/EmailNotificationToggle";
import { GroupInviteCard } from "@/components/GroupInviteCard";
import { JoinGroupCard } from "@/components/JoinGroupCard";
import { BggCollectionImport } from "@/components/BggCollectionImport";
import { isEmailConfigured } from "@/lib/email";

export default async function ProfilePage() {
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
    <div className="page-shell">
      <PageHeader title="My Profile" subtitle={user.email ?? undefined} />

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            About you
          </h2>
          <ProfileForm profile={profile} />
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Your group
          </h2>
          <div className="space-y-4">
            {activeGroup && (
              <GroupInviteCard
                name={activeGroup.name}
                inviteCode={activeGroup.invite_code}
              />
            )}
            <JoinGroupCard />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Import & notifications
          </h2>
          <div className="space-y-4">
            <BggCollectionImport />
            <PushNotificationToggle />
            {isEmailConfigured() && (
              <EmailNotificationToggle
                enabled={profile.email_notifications !== false}
                userId={user.id}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
