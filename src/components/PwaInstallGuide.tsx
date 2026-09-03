"use client";

import { useSyncExternalStore } from "react";
import { detectPwaPlatform } from "@/lib/pwa-platform";

function subscribeNoop() {
  return () => {};
}

function getClientPlatform() {
  return detectPwaPlatform(
    navigator.userAgent || "",
    navigator.platform || "",
    navigator.maxTouchPoints || 0
  );
}

function getStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function subscribeStandalone(onStoreChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

export function PwaInstallGuide() {
  const platform = useSyncExternalStore(
    subscribeNoop,
    getClientPlatform,
    () => "desktop" as const
  );
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    getStandalone,
    () => false
  );

  if (standalone) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
        You&apos;re already using BgLib as an installed app. Nice.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {platform === "ios" && (
        <ol className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <li>
            1. Open this site in{" "}
            <strong className="text-foreground">Safari</strong> (not Chrome or
            in-app browsers).
          </li>
          <li>
            2. Tap the <strong className="text-foreground">Share</strong> button
            (square with an arrow).
          </li>
          <li>
            3. Scroll and tap{" "}
            <strong className="text-foreground">Add to Home Screen</strong> — not
            Add to Dock.
          </li>
          <li>4. Confirm Add. BgLib will appear like a normal app icon.</li>
        </ol>
      )}
      {platform === "android" && (
        <ol className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <li>1. Open the browser menu (three dots).</li>
          <li>
            2. Tap <strong className="text-foreground">Install app</strong> or{" "}
            <strong className="text-foreground">Add to Home screen</strong>.
          </li>
          <li>3. Confirm. You can then open BgLib from your home screen.</li>
        </ol>
      )}
      {platform === "desktop" && (
        <ol className="space-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <li>
            1. Look for an <strong className="text-foreground">install</strong>{" "}
            icon in the address bar, or open the browser menu.
          </li>
          <li>
            2. Choose <strong className="text-foreground">Install BgLib</strong>{" "}
            or <strong className="text-foreground">Add to Home Screen</strong>.
          </li>
          <li>
            On iPhone: use Safari → Share →{" "}
            <strong className="text-foreground">Add to Home Screen</strong> (not
            Add to Dock).
          </li>
        </ol>
      )}
    </div>
  );
}
