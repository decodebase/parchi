"use client";

import { useEffect, useState } from "react";
import { tokenToQRDataURL } from "@/lib/utils/qrcode";
import { cn } from "@/lib/utils/cn";

interface QRDisplayProps {
  qrToken: string;
  ticketId: string;
  className?: string;
}

export function QRDisplay({ qrToken, ticketId, className }: QRDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tokenToQRDataURL(qrToken)
      .then((url) => {
        if (!cancelled) { setQrDataUrl(url); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [qrToken]);

  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="w-[220px] h-[220px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#EEE] border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2">
          <span className="text-3xl">⚠️</span>
          <p className="text-xs text-center text-[#999]">Could not render QR code</p>
        </div>
      )}
      {qrDataUrl && !loading && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Ticket QR Code"
            width={220}
            height={220}
            className="block rounded-xl"
          />
          {/* Parchi logo center overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center border border-white/10">
              <span className="text-base">🎫</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
