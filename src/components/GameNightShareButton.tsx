"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  buildGameNightShareMessage,
  gameNightEventUrl,
  gameNightShareTitle,
} from "@/lib/game-night-share";

export type GameNightShareDetails = {
  gameNightId: string;
  title: string;
  scheduledAt: string;
  location?: string | null;
  hostName?: string | null;
  gameTitles?: string[];
  groupName?: string | null;
  inviteCode?: string | null;
};

function shareUrls(gameNightId: string) {
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");
  return {
    eventUrl: gameNightEventUrl(origin || window.location.origin, gameNightId),
    signupUrl: `${(origin || window.location.origin).replace(/\/$/, "")}/signup`,
  };
}

function shareMessage(details: GameNightShareDetails) {
  const { eventUrl, signupUrl } = shareUrls(details.gameNightId);
  return buildGameNightShareMessage({
    title: details.title,
    when: formatDateTime(details.scheduledAt),
    location: details.location,
    hostName: details.hostName,
    gameTitles: details.gameTitles,
    eventUrl,
    groupName: details.groupName,
    inviteCode: details.inviteCode,
    signupUrl,
  });
}

export async function shareGameNight(details: GameNightShareDetails) {
  const { eventUrl } = shareUrls(details.gameNightId);
  const text = shareMessage(details);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: gameNightShareTitle(details.title),
        text,
        url: eventUrl,
      });
      return "shared" as const;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled" as const;
      }
    }
  }

  await navigator.clipboard.writeText(text);
  return "copied" as const;
}

export function GameNightShareButton({
  details,
  variant = "button",
}: {
  details: GameNightShareDetails;
  variant?: "button" | "icon" | "card";
}) {
  const [copied, setCopied] = useState<"message" | "link" | null>(null);

  async function copy(kind: "message" | "link") {
    const { eventUrl } = shareUrls(details.gameNightId);
    await navigator.clipboard.writeText(
      kind === "link" ? eventUrl : shareMessage(details)
    );
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  async function share(event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    const result = await shareGameNight(details);
    if (result === "copied") {
      setCopied("message");
      setTimeout(() => setCopied(null), 2000);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        className="pressable inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground"
        aria-label={`Share ${details.title}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div className="mt-4 rounded-xl border border-border bg-surface p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Share this game night</p>
          <p className="mt-1 text-xs text-muted">
            Send the details and RSVP link. Friends outside the group can join
            with the invite code.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={share}
            className="pressable inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-fg"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => void copy("message")}
            className="pressable inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium hover:bg-surface"
          >
            {copied === "message" ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied === "message" ? "Copied!" : "Copy message"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copy("link")}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          {copied === "link" ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied === "link" ? "Copied link" : "Copy RSVP link"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
