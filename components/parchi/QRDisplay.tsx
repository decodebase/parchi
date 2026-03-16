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
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <p className="text-xs text-center text-[#999]">Could not render QR code</p>
        </div>
      )}
      {qrDataUrl && !loading && (
        <div className="relative">
          {/* White background ensures black modules are scannable on dark ticket cards */}
          <div className="bg-white rounded-xl p-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Ticket QR Code"
            width={220}
            height={220}
            className="block rounded-lg"
          />
          </div>
          {/* Parchi logo center overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
