"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  LogOut,
  Plus,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import {
  createGroup,
  leaveGroup,
  renameGroup,
} from "@/lib/group-actions";
import { GroupInviteCard } from "@/components/GroupInviteCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { parseJsonResponse } from "@/lib/parse-json-response";

type Props = {
  group: {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
  };
  myRole: string;
  memberCount: number;
  isSoleOwner: boolean;
};

export function GroupSettingsCard({
  group,
  myRole,
  memberCount,
  isSoleOwner,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [renameError, setRenameError] = useState("");
  const [renameSuccess, setRenameSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [copyOnCreate, setCopyOnCreate] = useState(true);
  const [createError, setCreateError] = useState("");
  const [createNotice, setCreateNotice] = useState("");

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const isOwner = myRole === "owner";

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setRenameError("");
    setRenameSuccess("");

    startTransition(async () => {
      const res = await renameGroup(group.id, {
        name,
        description: description || null,
      });
      if (res.error) {
        setRenameError(res.error);
        return;
      }
      setRenameSuccess("Group updated.");
      router.refresh();
    });
  }

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateNotice("");

    if (!newGroupName.trim()) {
      setCreateError("Enter a group name");
      return;
    }

    startTransition(async () => {
      const res = await createGroup(newGroupName.trim());
      if (res.error) {
        setCreateError(res.error);
        return;
      }

      if (copyOnCreate && res.group) {
        try {
          const copyRes = await fetch("/api/groups/copy-library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "copy",
              source_group_id: group.id,
              target_group_id: res.group.id,
              mode: "my_collection",
            }),
          });
          const copyData = await parseJsonResponse<{
            copied?: number;
            linked?: number;
            failed?: number;
            error?: string;
          }>(copyRes);

          if (!copyRes.ok) {
            setCreateNotice(
              `Group created, but copying games failed: ${copyData.error ?? "unknown error"}`
            );
          } else {
            const copied = copyData.copied ?? 0;
            const linked = copyData.linked ?? 0;
            setCreateNotice(
              copied + linked > 0
                ? `Copied ${copied} game${copied !== 1 ? "s" : ""}${
                    linked > 0
                      ? ` and linked ${linked} existing`
                      : ""
                  } from ${group.name}.`
                : `Group created. No games needed copying from ${group.name}.`
            );
          }
        } catch (err) {
          setCreateNotice(
            `Group created, but copying games failed: ${
              err instanceof Error ? err.message : "unknown error"
            }`
          );
        }
      }

      setNewGroupName("");
      setShowCreate(false);
      router.refresh();
    });
  }

  function handleLeave() {
    setLeaveError("");

    startTransition(async () => {
      const res = await leaveGroup(group.id);
      if (res.error) {
        setLeaveError(res.error);
        return;
      }
      setLeaveOpen(false);
      if (res.leftLastGroup) {
        router.push("/profile");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <p className="font-medium text-sm">Active group</p>
          </div>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs capitalize text-muted">
            {myRole}
          </span>
        </div>

        {isOwner ? (
          <form onSubmit={handleRename} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Group name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                required
                disabled={pending}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm resize-none"
                disabled={pending}
              />
            </div>
            {renameError && (
              <p className="text-xs text-red-400">{renameError}</p>
            )}
            {renameSuccess && (
              <p className="text-xs text-green-400">{renameSuccess}</p>
            )}
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
          </form>
        ) : (
          <div>
            <p className="font-medium">{group.name}</p>
            {group.description && (
              <p className="mt-1 text-sm text-muted">{group.description}</p>
            )}
          </div>
        )}

        <Link
          href="/users"
          className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-primary">View</span>
        </Link>
      </div>

      <GroupInviteCard name={group.name} inviteCode={group.invite_code} />

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCreate((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4 text-primary" />
            Create another group
          </span>
          {showCreate ? (
            <ChevronUp className="h-4 w-4 text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted" />
          )}
        </button>
        {showCreate && (
          <form
            onSubmit={handleCreateGroup}
            className="space-y-3 border-t border-border px-4 pb-4 pt-3"
          >
            <p className="text-xs text-muted">
              Start a separate library for another crew. You&apos;ll switch to
              the new group automatically.
            </p>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Friday Night Gamers"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
              disabled={pending}
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={copyOnCreate}
                onChange={(e) => setCopyOnCreate(e.target.checked)}
                disabled={pending}
                className="mt-1 accent-primary"
              />
              <span>
                Copy my collection from {group.name}
                <span className="mt-0.5 block text-xs text-muted">
                  Adds the games you own here so you don&apos;t have to
                  reimport them.
                </span>
              </span>
            </label>
            {createError && (
              <p className="text-xs text-red-400">{createError}</p>
            )}
            <button
              type="submit"
              disabled={pending || !newGroupName.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create group"}
            </button>
          </form>
        )}
        {createNotice && (
          <p className="border-t border-border px-4 py-3 text-xs text-muted">
            {createNotice}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-medium text-red-400">Leave group</p>
        <p className="mt-1 text-xs text-muted">
          {isSoleOwner
            ? "You're the only owner, so you can't leave until another owner is added."
            : "You'll lose access to this group's library, plays, and game nights."}
        </p>
        {leaveError && (
          <p className="mt-2 text-xs text-red-400">{leaveError}</p>
        )}
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          disabled={pending || isSoleOwner}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Leave {group.name}
        </button>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        title={`Leave ${group.name}?`}
        description="You'll lose access to this group's library and history. You can rejoin later with the invite code."
        confirmLabel="Leave group"
        variant="danger"
        loading={pending}
        onConfirm={handleLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}
