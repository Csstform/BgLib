"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DetachExpansionButton({
  expansionId,
  expansionTitle,
  baseGameTitle,
}: {
  expansionId: string;
  expansionTitle: string;
  baseGameTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function detach() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/games/${expansionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_game_id: null }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to unlink expansion");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
        aria-label={`Unlink ${expansionTitle}`}
      >
        <Unlink className="h-3.5 w-3.5" />
        Unlink
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ConfirmDialog
        open={open}
        title="Unlink expansion?"
        description={`Remove "${expansionTitle}" from "${baseGameTitle}"? It will appear as a separate entry in your library.`}
        confirmLabel="Unlink"
        variant="danger"
        loading={loading}
        onConfirm={detach}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
