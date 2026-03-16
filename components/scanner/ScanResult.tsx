"use client";

/**
 * ScanResult.tsx
 *
 * Displays the outcome of a QR scan validation.
 * Three states: valid (green), already-used (yellow), invalid (red).
 * Includes ticket holder info and a "Scan Next" reset button.
 */

import { cn } from "@/lib/utils/cn";

export interface ScanResultData {
  valid: boolean;
  reason?: string;
  checkedInAt?: string;
  ticket?: {
    id: string;
    tierName?: string;
    holderName?: string;
    eventTitle?: string;
    eventVenue?: string;
    eventDate?: string;
  };
}

interface ScanResultProps {
  result: ScanResultData;
  onReset: () => void;
}

type ResultState = "valid" | "used" | "invalid";

function getState(result: ScanResultData): ResultState {
  if (result.valid) return "valid";
  if (result.reason?.toLowerCase().includes("already used")) return "used";
  return "invalid";
}

const STATE_CONFIG = {
  valid: {
    bg: "bg-success/10",
    border: "border-success/30",
    iconBg: "bg-success/20",
    iconColor: "text-success",
    label: "Valid Ticket",
    labelColor: "text-success",
    icon: CheckIcon,
    pulse: "bg-success",
  },
  used: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    iconBg: "bg-warning/20",
    iconColor: "text-warning",
    label: "Already Used",
    labelColor: "text-warning",
    icon: ClockIcon,
    pulse: "bg-warning",
  },
  invalid: {
    bg: "bg-error/10",
    border: "border-error/30",
    iconBg: "bg-error/20",
    iconColor: "text-error",
    label: "Invalid Ticket",
    labelColor: "text-error",
    icon: XIcon,
    pulse: "bg-error",
  },
} as const;

export default function ScanResult({ result, onReset }: ScanResultProps) {
  const state = getState(result);
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  const t = result.ticket;

  return (
    <div
      className={cn(
        "w-full max-w-sm mx-auto rounded-2xl border p-6 space-y-5 shadow-xl",
        config.bg,
        config.border
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Status icon + label */}
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Pulsing ring + icon */}
        <div className="relative">
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-30",
              config.pulse
            )}
          />
          <div
            className={cn(
              "relative w-14 h-14 rounded-full flex items-center justify-center",
              config.iconBg
            )}
          >
            <Icon className={cn("w-7 h-7", config.iconColor)} />
          </div>
        </div>

        <div>
          <p className={cn("text-lg font-bold", config.labelColor)}>
            {config.label}
          </p>
          {result.reason && state !== "valid" && (
            <p className="text-muted text-sm mt-0.5">{result.reason}</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Ticket details (when available) */}
      {t ? (
        <div className="space-y-3">
          {/* Holder */}
          <DetailRow label="Holder" value={t.holderName ?? "Guest"} highlight />

          {/* Tier */}
          {t.tierName && <DetailRow label="Tier" value={t.tierName} />}

          {/* Event */}
          {t.eventTitle && <DetailRow label="Event" value={t.eventTitle} />}

          {/* Venue */}
          {t.eventVenue && <DetailRow label="Venue" value={t.eventVenue} />}

          {/* Checked-in time (for "used" state) */}
          {state === "used" && result.checkedInAt && (
            <DetailRow
              label="Checked in"
              value={formatDateTime(result.checkedInAt)}
            />
          )}
        </div>
      ) : (
        /* No ticket info — probably totally invalid QR */
        <div className="text-center py-2">
          <p className="text-muted text-sm">No ticket data available.</p>
          <p className="text-muted text-xs mt-1">
            The QR code may be corrupted or not from Parchi.
          </p>
        </div>
      )}

      {/* Action */}
      <button
        onClick={onReset}
        className={cn(
          "mt-1 w-full py-3 rounded-xl font-semibold text-sm transition-colors",
          state === "valid"
            ? "bg-success text-white hover:bg-success/90"
            : state === "used"
            ? "bg-[#2A2A30] text-[#FAFAFA] hover:bg-[#3A3A40]"
            : "bg-[#2A2A30] text-[#FAFAFA] hover:bg-[#3A3A40]"
        )}
      >
        Scan Next Ticket
      </button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted text-xs shrink-0 pt-0.5">{label}</span>
      <span
        className={cn(
          "text-sm text-right leading-snug",
          highlight ? "text-text font-semibold" : "text-text/80"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
