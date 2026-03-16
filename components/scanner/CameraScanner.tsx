"use client";

/**
 * CameraScanner.tsx
 *
 * Live camera QR scanner using jsQR for frame-by-frame decoding.
 * Renders a video feed + canvas overlay; on QR detect calls onScan(qrToken).
 * Automatically pauses scanning after a result until reset() is called.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import jsQR from "jsqr";
import { cn } from "@/lib/utils/cn";

interface CameraScannerProps {
  /** Called with the raw QR string when a code is detected */
  onScan: (qrToken: string) => void;
  /** Pause scanning (e.g. while result modal is showing) */
  paused?: boolean;
  className?: string;
}

type CameraState = "requesting" | "active" | "denied" | "error";

export default function CameraScanner({ onScan, paused = false, className }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("requesting");

  const startCamera = useCallback(async () => {
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("active");
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraState("denied");
      } else {
        setCameraState("error");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Scan loop — runs on every animation frame
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert", // QR is black-on-white standard, no inversion needed
    });

    if (code && code.data) {
      const token = code.data.trim(); // remove any whitespace/newlines jsQR may append
      // Debounce: don't fire twice for the same token
      if (token !== lastTokenRef.current) {
        lastTokenRef.current = token;
        onScan(token);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onScan]);

  // Start/stop scan loop based on paused prop
  useEffect(() => {
    if (cameraState !== "active") return;

    if (!paused) {
      lastTokenRef.current = null; // reset debounce on resume
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [paused, cameraState, tick]);

  // Mount camera, unmount cleanup
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-black", className)}>
      {/* Video feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        aria-label="Camera feed for QR scanning"
      />

      {/* Canvas used for frame extraction — visually hidden but NOT display:none */}
      {/* display:none causes zero dimensions on some browsers, breaking getImageData */}
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0, width: 1, height: 1 }} />

      {/* Viewfinder overlay — always visible when camera is active */}
      {cameraState === "active" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dimmed border */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Scan window */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            {/* Clear hole via box-shadow */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
            />

            {/* Corner brackets */}
            <CornerBrackets active={!paused} />

            {/* Scanning line animation */}
            {!paused && (
              <div
                className="absolute left-3 right-3 h-0.5 bg-primary rounded-full opacity-80"
                style={{ animation: "scanLine 2s ease-in-out infinite" }}
              />
            )}

            {/* Paused indicator */}
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
                <div className="text-white/60 text-xs font-medium tracking-widest uppercase">
                  Paused
                </div>
              </div>
            )}
          </div>

          {/* Hint label */}
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm font-medium">
            Point at a Parchi QR code
          </p>
        </div>
      )}

      {/* Camera requesting state */}
      {cameraState === "requesting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface2">
          <Spinner />
          <p className="text-muted text-sm">Starting camera…</p>
        </div>
      )}

      {/* Permission denied */}
      {cameraState === "denied" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface2 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
            <CameraOffIcon />
          </div>
          <div>
            <p className="text-text font-semibold text-sm">Camera access denied</p>
            <p className="text-muted text-xs mt-1 leading-relaxed">
              Allow camera access in your browser settings, then reload this page.
            </p>
          </div>
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-surface border border-border text-text text-sm rounded-xl hover:border-primary/40 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Generic error */}
      {cameraState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface2 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning text-xl">
            ⚠
          </div>
          <div>
            <p className="text-text font-semibold text-sm">Camera unavailable</p>
            <p className="text-muted text-xs mt-1 leading-relaxed">
              Could not access a camera on this device.
            </p>
          </div>
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-surface border border-border text-text text-sm rounded-xl hover:border-primary/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Scan line keyframes injected once */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 12px;  opacity: 0.9; }
          50%  { top: calc(100% - 12px); opacity: 0.9; }
          100% { top: 12px;  opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CornerBrackets({ active }: { active: boolean }) {
  const color = active ? "#FF6A3D" : "#6B7280";
  return (
    <>
      {/* Top-left */}
      <span
        className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-300"
        style={{ borderColor: color }}
      />
      {/* Top-right */}
      <span
        className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 rounded-tr-xl transition-colors duration-300"
        style={{ borderColor: color }}
      />
      {/* Bottom-left */}
      <span
        className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 rounded-bl-xl transition-colors duration-300"
        style={{ borderColor: color }}
      />
      {/* Bottom-right */}
      <span
        className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 rounded-br-xl transition-colors duration-300"
        style={{ borderColor: color }}
      />
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-7 w-7 text-primary"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg
      className="w-6 h-6 text-error"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
      />
    </svg>
  );
}
