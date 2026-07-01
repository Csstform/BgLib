import Link from "next/link";
import type { CSSProperties } from "react";
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
        <h1 className="animate-header text-2xl font-bold mb-1">Welcome back!</h1>
        <p className="text-muted mb-8 animate-header" style={{ animationDelay: "60ms" }}>
          Your shared board game library
        </p>

        <div className="grid gap-3">
          {[
            { href: "/library", icon: Library, title: "Browse Library", desc: "See all games and who owns them", featured: false },
            { href: "/picker", icon: Sparkles, title: "What can we play?", desc: "Pick a game for tonight", featured: true },
            { href: "/game-nights", icon: CalendarDays, title: "Game Nights", desc: "Plan and RSVP to sessions", featured: false },
            { href: "/loans", icon: ArrowLeftRight, title: "Loans", desc: "Track borrowed and lent games", featured: false },
            { href: "/more", icon: LayoutGrid, title: "More", desc: "Collection, players, plays, profile, and settings", featured: false },
          ].map(({ href, icon: Icon, title, desc, featured }, i) => (
            <Link
              key={href}
              href={href}
              className={`touch-card stagger-item flex items-center gap-4 rounded-xl border p-4 ${
                featured
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-surface"
              }`}
              style={{ "--stagger": i + 1 } as CSSProperties}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 pb-20 text-center min-h-[calc(100dvh-3.5rem)]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-fg shadow-lg shadow-primary/20 animate-page">
        <Dices className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-bold mb-2 animate-header">BgLib</h1>
      <p className="text-muted max-w-sm mb-8 leading-relaxed">
        A shared board game catalogue for your group. Track who owns what,
        browse the library, and never forget whose copy to borrow.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
        <Link
          href="/signup"
          className="btn-primary rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="btn-secondary rounded-xl border border-border py-3 font-medium hover:bg-surface-2"
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
