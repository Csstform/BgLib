"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGroup,
  joinGroupByInvite,
  completeOnboarding,
} from "@/lib/group-actions";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { EmailNotificationToggle } from "@/components/EmailNotificationToggle";
import { OnboardingQuickAdd } from "@/components/OnboardingQuickAdd";
import { PwaInstallGuide } from "@/components/PwaInstallGuide";
import type { Group } from "@/lib/types";
import { Dices, Users, Plus, Smartphone, Check } from "lucide-react";

const STEPS = [
  { id: "group", label: "Group" },
  { id: "games", label: "Games" },
  { id: "app", label: "App" },
  { id: "done", label: "Done" },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function OnboardingWizard({
  groups,
  userId,
  groupId,
  emailConfigured,
  emailNotificationsEnabled,
  initialInviteCode,
}: {
  groups: Group[];
  userId: string;
  groupId: string | null;
  emailConfigured: boolean;
  emailNotificationsEnabled: boolean;
  initialInviteCode?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("group");
  const [activeGroupId, setActiveGroupId] = useState(groupId);
  const [groupMode, setGroupMode] = useState<"create" | "join">(
    groups.length ? "join" : "create"
  );
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState(
    (initialInviteCode ?? "").trim().toUpperCase()
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const currentGroup =
    groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;

  const stepIndex = STEPS.findIndex((s) => s.id === step);
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
        else {
          setActiveGroupId(res.group?.id ?? null);
          setStep("games");
        }
      } else {
        if (!inviteCode.trim()) {
          setError("Enter an invite code");
          return;
        }
        const res = await joinGroupByInvite(inviteCode);
        if (res.error) setError(res.error);
        else {
          setActiveGroupId(res.groupId ?? null);
          setStep("games");
        }
      }
    });
  }

  async function finish() {
    await completeOnboarding();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex justify-between gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {STEPS.map((s, i) => (
            <span key={s.id} className={i <= stepIndex ? "text-primary" : ""}>
              {s.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "group" && (
        <div className="space-y-4">
          <div className="mb-4 text-center">
            <Users className="mx-auto mb-2 h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold">
              {currentGroup ? "Your group" : "Set up your group"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {currentGroup
                ? "Every account starts with a personal library. Keep it, or join a friend's group with their invite code."
                : "Groups share one library, loans, and game nights. Create one or join with an invite code."}
            </p>
          </div>

          {currentGroup && (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-left">
              <p className="font-medium">{currentGroup.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                Invite code
              </p>
              <p className="font-mono text-lg tracking-widest text-primary">
                {currentGroup.invite_code}
              </p>
            </div>
          )}

          {currentGroup ? (
            <>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Friend's invite code (optional)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => {
                  if (inviteCode.trim()) handleGroup();
                  else setStep("games");
                }}
                disabled={pending}
                className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg disabled:opacity-50"
              >
                {pending
                  ? "..."
                  : inviteCode.trim()
                    ? "Join and continue"
                    : "Continue with this group"}
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGroupMode("create")}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
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
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
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
            </>
          )}
        </div>
      )}

      {step === "games" && (
        <div className="space-y-4">
          <div className="text-center">
            <Plus className="mx-auto mb-2 h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold">Add a couple of games</h2>
            <p className="mt-1 text-sm text-muted">
              Search BoardGameGeek, or add by title if you can&apos;t find a match.
              A full BGG collection import is available later from Profile.
            </p>
          </div>

          {activeGroupId ? (
            <OnboardingQuickAdd userId={userId} groupId={activeGroupId} />
          ) : (
            <p className="text-center text-sm text-muted">
              Set up your group first to add games.
            </p>
          )}

          <button
            type="button"
            onClick={() => setStep("app")}
            className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => setStep("app")}
            className="w-full text-sm text-muted hover:text-foreground"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === "app" && (
        <div className="space-y-5">
          <div className="text-center">
            <Smartphone className="mx-auto mb-2 h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold">Install the app</h2>
            <p className="mt-1 text-sm text-muted">
              Add BgLib to your home screen so it opens like a normal app. On
              iPhone, that also unlocks push notifications.
            </p>
          </div>

          <PwaInstallGuide />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-sm text-muted">
              Optional. You can change these anytime in Profile.
            </p>
            <PushNotificationToggle
              unsupportedFallback={
                <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                  Push isn&apos;t available in this browser yet. On iPhone, install
                  to the Home Screen first, then open BgLib from that icon and
                  enable notifications here or in Profile.
                </p>
              }
            />
            {emailConfigured && (
              <EmailNotificationToggle
                enabled={emailNotificationsEnabled}
                userId={userId}
              />
            )}
          </div>

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
          <Check className="mx-auto h-10 w-10 text-green-400" />
          <h2 className="text-xl font-bold">You&apos;re all set</h2>
          <ul className="space-y-2 text-left text-sm text-muted">
            <li>Home shows upcoming game nights, recent plays, and suggestions.</li>
            <li>Share your group invite code from Profile so others can join.</li>
            <li>
              Plan a game night from the Game nights tab. Hosts can email invites
              with a calendar file.
            </li>
            <li>
              Subscribe to the group calendar from Profile to see events in Google
              or Apple Calendar.
            </li>
            <li>Import a full BoardGameGeek collection anytime from Profile.</li>
          </ul>
          <button
            type="button"
            onClick={finish}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-fg"
          >
            <Dices className="h-5 w-5" />
            Go to home
          </button>
        </div>
      )}
    </div>
  );
}
