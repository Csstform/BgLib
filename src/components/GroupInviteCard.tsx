"use client";

import { useState } from "react";
import { Copy, Check, Users, Share2 } from "lucide-react";
import { groupJoinUrl } from "@/lib/group-invite";

export function GroupInviteCard({
  name,
  inviteCode,
}: {
  name: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState<"code" | "message" | null>(null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const joinUrl =
    appUrl || (typeof window !== "undefined" ? window.location.origin : "")
      ? groupJoinUrl(
          appUrl || window.location.origin,
          inviteCode
        )
      : "";

  const inviteMessage = [
    `Join "${name}" on BgLib!`,
    "",
    `Invite code: ${inviteCode}`,
    joinUrl ? `Join link: ${joinUrl}` : "",
    "",
    "Open the link, or sign up and enter the invite code.",
  ]
    .filter(Boolean)
    .join("\n");

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(inviteMessage);
    setCopied("message");
    setTimeout(() => setCopied(null), 2000);
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${name} on BgLib`,
          text: inviteMessage,
          url: joinUrl || undefined,
        });
        return;
      } catch {
        // User cancelled or share failed — fall back to copy
      }
    }
    await copyMessage();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">{name}</p>
      </div>
      <p className="text-xs text-muted mb-3">
        Share this invite so friends can join your group
      </p>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm font-mono tracking-wider">
          {inviteCode}
        </code>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-lg bg-primary/20 p-2 text-primary hover:bg-primary/30"
          aria-label="Copy invite code"
        >
          {copied === "code" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg"
        >
          <Share2 className="h-4 w-4" />
          Share invite
        </button>
        <button
          type="button"
          onClick={copyMessage}
          className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          {copied === "message" ? "Copied!" : "Copy message"}
        </button>
      </div>
    </div>
  );
}
