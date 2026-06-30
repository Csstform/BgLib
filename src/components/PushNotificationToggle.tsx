"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

function getPushSupported(vapidKey?: string) {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!vapidKey
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationToggle() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = getPushSupported(vapidKey);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, [supported]);

  async function toggle() {
    if (!vapidKey) return;
    setLoading(true);
    setError("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notifications");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Game night notifications</p>
          <p className="text-xs text-muted mt-0.5">
            Get notified when someone plans a game night
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            subscribed
              ? "bg-primary/20 text-primary"
              : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          {subscribed ? (
            <>
              <Bell className="h-4 w-4" />
              On
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4" />
              Off
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
