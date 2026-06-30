"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGroup,
  joinGroupByInvite,
  completeOnboarding,
} from "@/lib/group-actions";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { Dices, Users, Plus, Bell, Check } from "lucide-react";

const STEPS = ["group", "game", "notifications", "done"] as const;

export function OnboardingWizard({ hasGroup }: { hasGroup: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<(typeof STEPS)[number]>(
    hasGroup ? "game" : "group"
  );
  const [groupMode, setGroupMode] = useState<"create" | "join">("create");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  async function handleGroup() {
    setError("");
    startTransition(async () => {
      if (groupMode === "create") {
        if (!groupName.trim()) {
          setError("Enter a group name");
          return;
        }
        const res = await createGroup(groupName);
        if (res.error) setError(res.error);
        else setStep("game");
      } else {
        if (!inviteCode.trim()) {
          setError("Enter an invite code");
          return;
        }
        const res = await joinGroupByInvite(inviteCode);
        if (res.error) setError(res.error);
        else setStep("game");
      }
    });
  }

  async function finish() {
    await completeOnboarding();
    router.push("/library");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              STEPS.indexOf(step) >= i ? "bg-primary" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "group" && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <Users className="h-10 w-10 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-bold">Set up your group</h2>
            <p className="text-sm text-muted mt-1">
              BgLib is organized by gaming groups. Create one or join with an
              invite code.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGroupMode("create")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border ${
                groupMode === "create"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border"
              }`}
            >
              Create group
            </button>
            <button
              type="button"
              onClick={() => setGroupMode("join")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border ${
                groupMode === "join"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border"
              }`}
            >
              Join with code
            </button>
          </div>

          {groupMode === "create" ? (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Friday Night Board Gamers"
              className={inputClass}
            />
          ) : (
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="INVITE CODE"
              className={inputClass}
            />
          )}

          <button
            type="button"
            onClick={handleGroup}
            disabled={pending}
            className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg disabled:opacity-50"
          >
            {pending ? "..." : "Continue"}
          </button>
        </div>
      )}

      {step === "game" && (
        <div className="space-y-4 text-center">
          <Plus className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-xl font-bold">Add your first game</h2>
          <p className="text-sm text-muted">
            Search BoardGameGeek to quickly add games to your group library.
          </p>
        <button
          type="button"
          onClick={() => router.push("/add-game")}
          className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg"
        >
          Add a game manually
        </button>
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="w-full rounded-xl border border-border py-3 font-medium hover:bg-surface-2"
        >
          Import from BoardGameGeek
        </button>
          <button
            type="button"
            onClick={() => setStep("notifications")}
            className="w-full text-sm text-muted hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === "notifications" && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <Bell className="h-10 w-10 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-bold">Stay in the loop</h2>
            <p className="text-sm text-muted mt-1">
              Get notified about game nights, loan requests, and updates.
            </p>
          </div>
          <PushNotificationToggle />
          <button
            type="button"
            onClick={() => setStep("done")}
            className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg"
          >
            Continue
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <Check className="h-10 w-10 text-green-400 mx-auto" />
          <h2 className="text-xl font-bold">You&apos;re all set!</h2>
          <p className="text-sm text-muted">
            Browse your library, use the game picker before game night, and
            invite friends with your group&apos;s invite code from Profile.
          </p>
          <button
            type="button"
            onClick={finish}
            className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg flex items-center justify-center gap-2"
          >
            <Dices className="h-5 w-5" />
            Go to library
          </button>
        </div>
      )}
    </div>
  );
}
