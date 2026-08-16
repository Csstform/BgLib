"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { removeGroupMember } from "@/lib/group-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function RemoveMemberButton({
  groupId,
  userId,
  displayName,
}: {
  groupId: string;
  userId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    setError("");

    startTransition(async () => {
      const res = await removeGroupMember(groupId, userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-red-500/10 hover:text-red-400"
        aria-label={`Remove ${displayName}`}
      >
        <UserMinus className="h-3.5 w-3.5" />
        Remove
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ConfirmDialog
        open={open}
        title="Remove member?"
        description={`Remove ${displayName} from this group? They'll lose access to the shared library.`}
        confirmLabel="Remove"
        variant="danger"
        loading={pending}
        onConfirm={handleRemove}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
