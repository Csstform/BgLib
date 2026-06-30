import Link from "next/link";
import {
  Dices,
  Library,
  Users,
  Share2,
  CalendarDays,
  ArrowLeftRight,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  let user = null;

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (user) {
    return (
      <div className="px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold mb-1">Welcome back!</h1>
        <p className="text-muted mb-8">Your shared board game library</p>

        <div className="grid gap-3">
          <Link
            href="/library"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Browse Library</h2>
              <p className="text-sm text-muted">See all games and who owns them</p>
            </div>
          </Link>
          <Link
            href="/picker"
            className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">What can we play?</h2>
              <p className="text-sm text-muted">Pick a game for tonight</p>
            </div>
          </Link>
          <Link
            href="/game-nights"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Game Nights</h2>
              <p className="text-sm text-muted">Plan and RSVP to sessions</p>
            </div>
          </Link>
          <Link
            href="/loans"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">Loans</h2>
              <p className="text-sm text-muted">Track borrowed and lent games</p>
            </div>
          </Link>
          <Link
            href="/more"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold">More</h2>
              <p className="text-sm text-muted">
                Collection, players, plays, profile, and settings
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 pb-20 text-center min-h-[calc(100dvh-3.5rem)]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-fg shadow-lg shadow-primary/20">
        <Dices className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold mb-2">BgLib</h1>
      <p className="text-muted max-w-sm mb-8 leading-relaxed">
        A shared board game catalogue for your group. Track who owns what,
        browse the library, and never forget whose copy to borrow.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
        <Link
          href="/signup"
          className="rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-border py-3 font-medium hover:bg-surface-2 transition-colors"
        >
          Sign in
        </Link>
      </div>

      <div className="grid gap-4 max-w-sm text-left">
        <div className="flex gap-3">
          <Library className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Shared catalogue</p>
            <p className="text-xs text-muted">One library for your whole gaming group</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Share2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Ownership tracking</p>
            <p className="text-xs text-muted">Instantly see who owns each game</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Multi-user</p>
            <p className="text-xs text-muted">Everyone manages their own collection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
