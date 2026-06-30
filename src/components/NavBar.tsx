import Link from "next/link";
import {
  Library,
  Users,
  PlusCircle,
  User,
  LogIn,
  LogOut,
  Dices,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/users", label: "Players", icon: Users },
  { href: "/add-game", label: "Add", icon: PlusCircle },
  { href: "/collection", label: "Mine", icon: Dices },
  { href: "/profile", label: "Profile", icon: User },
];

export async function NavBar() {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <Dices className="h-5 w-5" />
            </span>
            BgLib
          </Link>
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </header>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md safe-bottom">
          <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground transition-colors min-w-[56px]"
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
