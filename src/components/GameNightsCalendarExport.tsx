"use client";

import { useState } from "react";
import { CalendarPlus, Download, Link2, Check, Rss } from "lucide-react";
import { buildCalendarFeedUrl } from "@/lib/calendar-feed-url";

export function GameNightsCalendarExport({
  feedToken,
  appUrl,
  nightCount,
}: {
  feedToken: string;
  appUrl: string;
  nightCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const subscribeUrl = buildCalendarFeedUrl(feedToken, appUrl);

  async function copySubscribeUrl() {
    await navigator.clipboard.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Calendar sync</p>
          <p className="mt-1 text-xs text-muted">
            Subscribe in Apple Calendar, Google Calendar, or Outlook to keep
            upcoming game nights in sync.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copySubscribeUrl}
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/15"
        >
          {copied ? <Check className="h-4 w-4" /> : <Rss className="h-4 w-4" />}
          {copied ? "Copied subscribe URL" : "Copy subscribe URL"}
        </button>
        <a
          href="/api/game-nights/calendar"
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
        >
          <Download className="h-4 w-4" />
          Download {nightCount} upcoming
        </a>
      </div>

      <p className="text-xs text-muted">
        Paste the subscribe URL into your calendar app&apos;s &quot;Subscribe to
        calendar&quot; or &quot;From URL&quot; option. Use{" "}
        <span className="font-mono text-[11px]">webcal://</span> links in Apple
        Calendar, or the https version in Google Calendar.
      </p>
      <button
        type="button"
        onClick={copySubscribeUrl}
        className="flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left text-xs text-muted"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-mono">{subscribeUrl}</span>
      </button>
    </div>
  );
}
