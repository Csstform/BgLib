import Link from "next/link";
import { Library, LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, getUserGroups } from "@/lib/group";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { BottomNav } from "@/components/BottomNav";

export async function NavBar() {
  let user = null;
  let groups: Awaited<ReturnType<typeof getUserGroups>> = [];
  let activeGroupId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (user) {
      groups = await getUserGroups();
      activeGroupId = await getActiveGroupId();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 gap-2">
          <Link href="/" className="pressable flex items-center gap-2 font-bold text-lg shrink-0 rounded-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <Library className="h-5 w-5" />
            </span>
            BgLib
          </Link>
          {user && groups.length > 0 && (
            <GroupSwitcher groups={groups} activeGroupId={activeGroupId} />
          )}
          {user ? (
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                aria-label="Sign out"
                className="pressable touch-target flex items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="btn-primary flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover shrink-0"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </header>

      {user && <BottomNav />}
    </>
  );
}
