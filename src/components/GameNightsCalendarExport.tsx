"use client";

import { useState } from "react";
import { CalendarPlus, Download, Link2, Check, Rss } from "lucide-react";
import {
  buildCalendarFeedUrl,
  buildCalendarWebcalUrl,
  buildGoogleCalendarSubscribeUrl,
} from "@/lib/calendar-feed-url";

export function GameNightsCalendarExport({
  feedToken,
  appUrl,
  nightCount,
}: {
  feedToken: string;
  appUrl: string;
  nightCount: number;
}) {
  const [copied, setCopied] = useState<"https" | "webcal" | null>(null);
  const httpsUrl = buildCalendarFeedUrl(feedToken, appUrl);
  const webcalUrl = buildCalendarWebcalUrl(feedToken, appUrl);
  const googleUrl = buildGoogleCalendarSubscribeUrl(feedToken, appUrl);

  async function copyUrl(url: string, kind: "https" | "webcal") {
    await navigator.clipboard.writeText(url);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
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
            Subscribe so upcoming game nights stay on your calendar as they
            change.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/15"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to Google Calendar
        </a>
        <a
          href={webcalUrl}
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
        >
          <Rss className="h-4 w-4" />
          Apple Calendar
        </a>
        <button
          type="button"
          onClick={() => copyUrl(httpsUrl, "https")}
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
        >
          {copied === "https" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {copied === "https" ? "Copied feed URL" : "Copy feed URL"}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.assign("/api/game-nights/calendar");
          }}
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
        >
          <Download className="h-4 w-4" />
          Download {nightCount} upcoming
        </button>
      </div>

      <p className="text-xs text-muted">
        Google Calendar can take several hours to refresh after the first add.
        To subscribe manually, use Other calendars → From URL and paste the
        https feed.
      </p>
      <button
        type="button"
        onClick={() => copyUrl(httpsUrl, "https")}
        className="flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left text-xs text-muted"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-mono">{httpsUrl}</span>
      </button>
      <button
        type="button"
        onClick={() => copyUrl(webcalUrl, "webcal")}
        className="flex w-full items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-left text-xs text-muted"
      >
        {copied === "webcal" ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
        ) : (
          <Rss className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate font-mono">{webcalUrl}</span>
      </button>
    </div>
  );
}
