"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/barcode";
import { BARCODE_FORMATS, getBarcodeDetector } from "@/lib/barcode-detector";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (upc: string) => void;
};

export function BarcodeScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const handledRef = useRef(false);
  const [manualUpc, setManualUpc] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const submitUpc = useCallback(
    (raw: string) => {
      const upc = normalizeBarcode(raw);
      if (!upc) {
        setCameraError("Enter a valid 8–14 digit barcode");
        return;
      }
      handledRef.current = true;
      stopCamera();
      onScan(upc);
    },
    [onScan, stopCamera]
  );

  useEffect(() => {
    if (!open) {
      handledRef.current = false;
      setManualUpc("");
      setCameraError("");
      setScannerReady(false);
      stopCamera();
      return;
    }

    let cancelled = false;
    const BarcodeDetector = getBarcodeDetector();

    async function startCamera() {
      setStarting(true);
      setCameraError("");
      setScannerReady(false);

      if (!BarcodeDetector) {
        setCameraError(
          "Live scanning is not supported in this browser. Type the barcode below (works on all devices)."
        );
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });
        setScannerReady(true);
        setStarting(false);

        const tick = async () => {
          if (cancelled || handledRef.current || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
            if (!cancelled && !handledRef.current) {
              scanFrameRef.current = requestAnimationFrame(tick);
            }
            return;
          }

          try {
            const codes = await detector.detect(video);
            const match = codes.find((code) => normalizeBarcode(code.rawValue));
            if (match) {
              submitUpc(match.rawValue);
              return;
            }
          } catch {
            // detect() can fail transiently while the camera adjusts.
          }

          if (!cancelled && !handledRef.current) {
            scanFrameRef.current = requestAnimationFrame(tick);
          }
        };

        scanFrameRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera unavailable. Enter the barcode number from the box instead."
          );
          setStarting(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera, submitUpc]);

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
            {(starting || scannerReady) && (
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
