"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "bglib-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos()) {
      setShowIosHint(true);
      setHidden(false);
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (hidden) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4 safe-bottom pointer-events-none"
      style={{ bottom: "calc(var(--bottom-nav-height) + 0.5rem)" }}
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-xl border border-primary/30 bg-surface shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm">Install BgLib</p>
            {showIosHint ? (
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Tap{" "}
                <Share className="inline h-3.5 w-3.5 text-primary -mt-0.5" />{" "}
                Share in Safari, then <strong>Add to Home Screen</strong> for
                the full app experience.
              </p>
            ) : (
              <p className="text-xs text-muted mt-1">
                Add BgLib to your home screen for faster access and offline
                library browsing.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1 text-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!showIosHint && deferred && (
          <button
            type="button"
            onClick={install}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg"
          >
            <Download className="h-4 w-4" />
            Install app
          </button>
        )}
      </div>
    </div>
  );
}
