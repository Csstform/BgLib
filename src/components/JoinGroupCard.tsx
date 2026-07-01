"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { joinGroupByInvite } from "@/lib/group-actions";

export function JoinGroupCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    setError("");
    setSuccess("");

    if (!inviteCode.trim()) {
      setError("Enter an invite code");
      return;
    }

    startTransition(async () => {
      const res = await joinGroupByInvite(inviteCode);
      if (res.error) {
        setError(res.error);
        return;
      }
      setInviteCode("");
      setSuccess("Joined! Switched to your new group.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">Join another group</p>
      </div>
      <p className="text-xs text-muted mb-3">
        Enter an invite code from a friend. You can switch between groups from
        the header anytime.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="INVITE CODE"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
          disabled={pending}
        />
        <button
          type="button"
          onClick={handleJoin}
          disabled={pending || !inviteCode.trim()}
          className="btn-primary shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {success && <p className="text-xs text-green-400 mt-2">{success}</p>}
    </div>
  );
}
