"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export function EmailNotificationToggle({
  enabled,
  userId,
}: {
  enabled: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ email_notifications: !on })
      .eq("id", userId);
    setOn(!on);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Email notifications</p>
          <p className="text-xs text-muted mt-0.5">
            Loans, game nights, and reminders via email
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            on ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted"
          }`}
        >
          <Mail className="h-4 w-4" />
          {on ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
