"use client";

import { useState } from "react";
import { CalendarPlus, Download, Link2, Check } from "lucide-react";
import { googleCalendarUrl } from "@/lib/ics";
import type { IcsEvent } from "@/lib/ics";

export function GameNightCalendarActions({
  gameNightId,
  event,
}: {
  gameNightId: string;
  event: IcsEvent;
}) {
  const [copied, setCopied] = useState(false);

  const googleUrl = googleCalendarUrl({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  });

  async function copySubscribeHint() {
    await navigator.clipboard.writeText(
      `Download the calendar file from ${window.location.origin}/api/game-nights/${gameNightId}/calendar or use Google Calendar for this event.`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Add to calendar</p>
        <p className="mt-1 text-xs text-muted">
          Download an event file or open it directly in Google Calendar.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`/api/game-nights/${gameNightId}/calendar`}
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
        >
          <Download className="h-4 w-4" />
          Download .ics
        </a>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/15"
        >
          <CalendarPlus className="h-4 w-4" />
          Google Calendar
        </a>
      </div>
      <button
        type="button"
        onClick={copySubscribeHint}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy calendar link info"}
      </button>
    </div>
  );
}
