import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { joinGroupByInvite } from "@/lib/group-actions";
import { normalizeInviteCode } from "@/lib/group-invite";

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalizeInviteCode(decodeURIComponent(raw));

  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  if (!code) redirect("/signup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .rpc("lookup_group_by_invite", { invite: code })
    .returns<{ id: string; name: string; invite_code: string }[]>()
    .maybeSingle();

  if (user) {
    if (group) {
      const result = await joinGroupByInvite(code);
      if (!result.error) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        redirect(profile?.onboarding_completed ? "/library" : "/onboarding");
      }
    }
  }

  const signupHref = `/signup?invite=${encodeURIComponent(code)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(`/join/${code}`)}`;

  return (
    <div className="page-shell mx-auto flex min-h-[calc(100dvh-var(--header-height))] max-w-md flex-col justify-center">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">
          {group ? `Join ${group.name}` : "Join a group"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {group
            ? user
              ? `We couldn't add you to ${group.name}. You may already be a member, or the code is no longer valid.`
              : `Invite code ${code}. Sign up or sign in to join this library.`
            : `No group uses invite code ${code}. Check the code and try again.`}
        </p>
        {!user && (
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={signupHref}
              className="rounded-xl bg-primary py-3 text-sm font-medium text-primary-fg"
            >
              Sign up to join
            </Link>
            <Link
              href={loginHref}
              className="rounded-xl border border-border py-3 text-sm font-medium hover:bg-surface-2"
            >
              I already have an account
            </Link>
          </div>
        )}
        {user && (
          <Link
            href="/onboarding"
            className="mt-6 inline-block text-sm text-primary hover:underline"
          >
            Back to onboarding
          </Link>
        )}
      </div>
    </div>
  );
}
