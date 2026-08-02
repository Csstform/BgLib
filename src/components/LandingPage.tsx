import Link from "next/link";
import {
  Dices,
  Library,
  Users,
  CalendarDays,
  Sparkles,
  BarChart3,
  Share2,
} from "lucide-react";

import type { CSSProperties } from "react";

const features = [
  {
    icon: Library,
    title: "Shared catalogue",
    description:
      "One library for your whole group. Search BoardGameGeek or scan barcodes to add games fast.",
  },
  {
    icon: Users,
    title: "Ownership tracking",
    description:
      "See who owns each game at a glance. Request loans and keep track of due dates.",
  },
  {
    icon: Sparkles,
    title: "Game night picker",
    description:
      "Filter by players and time. Prioritize games you own but haven't played yet.",
  },
  {
    icon: CalendarDays,
    title: "Plan game nights",
    description:
      "Schedule sessions, collect RSVPs, and suggest games based on who's going.",
  },
  {
    icon: BarChart3,
    title: "Play history & stats",
    description:
      "Log sessions with winners and scores. Track what your group plays most.",
  },
  {
    icon: Share2,
    title: "Invite your crew",
    description:
      "Share an invite code so friends join your group and add their collections.",
  },
];

export function LandingPage() {
  return (
    <div className="flex flex-col px-4 pb-24 pt-8">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="animate-page mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-fg shadow-lg shadow-primary/25">
            <Dices className="h-10 w-10" />
          </div>
        </div>

        <h1 className="animate-header text-3xl font-bold tracking-tight">
          Your group&apos;s board game library
        </h1>
        <p className="animate-header mx-auto mt-3 max-w-sm text-muted leading-relaxed" style={{ animationDelay: "60ms" }}>
          BgLib helps friend groups track who owns what, plan game nights, and
          never argue about what to play.
        </p>

        <div
          className="animate-header mx-auto mt-8 flex w-full max-w-xs flex-col gap-3"
          style={{ animationDelay: "120ms" }}
        >
          <Link
            href="/signup"
            className="btn-primary rounded-xl bg-primary py-3.5 font-medium text-primary-fg hover:bg-primary-hover"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="btn-secondary rounded-xl border border-border py-3.5 font-medium hover:bg-surface-2"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-12 grid w-full max-w-lg gap-3">
        {features.map(({ icon: Icon, title, description }, i) => (
          <div
            key={title}
            className="stagger-item flex gap-4 rounded-xl border border-border bg-surface p-4 text-left"
            style={{ "--stagger": i + 1 } as CSSProperties}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-sm text-center text-xs text-muted">
        Free to use. Works on iOS and Android as a home-screen app — no app
        store required.
      </p>
    </div>
  );
}
