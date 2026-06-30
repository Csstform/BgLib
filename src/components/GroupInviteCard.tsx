"use client";

import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";

export function GroupInviteCard({
  name,
  inviteCode,
}: {
  name: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">{name}</p>
      </div>
      <p className="text-xs text-muted mb-2">
        Share this invite code so friends can join your group
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm font-mono tracking-wider">
          {inviteCode}
        </code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-primary/20 p-2 text-primary hover:bg-primary/30"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
