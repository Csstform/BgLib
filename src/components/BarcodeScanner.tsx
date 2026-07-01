"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Loader2, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/barcode";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (upc: string) => void;
};

export function BarcodeScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const handledRef = useRef(false);
  const [manualUpc, setManualUpc] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(false);

  const submitUpc = useCallback(
    (raw: string) => {
      const upc = normalizeBarcode(raw);
      if (!upc) {
        setCameraError("Enter a valid 8–14 digit barcode");
        return;
      }
      handledRef.current = true;
      controlsRef.current?.stop();
      onScan(upc);
    },
    [onScan]
  );

  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      setManualUpc("");
      setCameraError("");
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    async function startCamera() {
      setStarting(true);
      setCameraError("");

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled || !videoRef.current) return;

        const preferred =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[devices.length - 1] ??
          devices[0];

        const controls = await reader.decodeFromVideoDevice(
          preferred?.deviceId,
          videoRef.current,
          (result, err) => {
            if (handledRef.current) return;
            if (result) {
              submitUpc(result.getText());
            }
            if (err && err.name !== "NotFoundException") {
              // Continuous scanning throws NotFoundException when no code in frame.
            }
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera unavailable. Enter the barcode number from the box instead."
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, submitUpc]);

  if (!open) return null;

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl overflow-hidden animate-dropdown">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-medium">
            <Camera className="h-4 w-4 text-primary" />
            Scan barcode
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-lg p-2 text-muted hover:text-foreground"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            {(starting || !cameraError) && (
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-primary/60" />
            )}
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <p className="text-xs text-muted text-center">
            Point your camera at the UPC or EAN barcode on the game box.
          </p>

          {cameraError && (
            <p className="text-xs text-amber-400 text-center">{cameraError}</p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Or type barcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualUpc}
                onChange={(e) => setManualUpc(e.target.value)}
                className={inputClass}
                placeholder="711719577966"
              />
              <button
                type="button"
                onClick={() => submitUpc(manualUpc)}
                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
              >
                Look up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
