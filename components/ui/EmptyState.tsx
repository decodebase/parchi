import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import {
  Search, Ticket, AlertTriangle, Calendar, Frown, Megaphone,
} from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-3" : "py-16 px-6 gap-4",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "rounded-2xl bg-surface2 border border-border/60 flex items-center justify-center",
            compact ? "w-12 h-12" : "w-16 h-16"
          )}
        >
          {icon}
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className={cn("font-bold text-text", compact ? "text-sm" : "text-base")}>
          {title}
        </h3>
        {description && (
          <p className={cn("text-muted leading-relaxed max-w-xs mx-auto", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          variant={action.variant ?? "primary"}
          size={compact ? "sm" : "md"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ── Pre-built empties ─────────────────────────────────────────────────────────

export function NoEventsEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border/60 flex items-center justify-center">
        <Search className="w-7 h-7 text-muted" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-bold text-text text-base">No events found</h3>
        <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">
          We couldn&apos;t find any events matching your search. Try different keywords or browse all events.
        </p>
      </div>
      {onBrowse && (
        <button
          onClick={onBrowse}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Browse all events
        </button>
      )}
    </div>
  );
}

export function NoTicketsEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border/60 flex items-center justify-center">
        <Ticket className="w-7 h-7 text-muted" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-bold text-text text-base">No tickets yet</h3>
        <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">
          You haven&apos;t bought any tickets yet. Discover events near you and grab your parchi!
        </p>
      </div>
      {onBrowse && (
        <button
          onClick={onBrowse}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Discover events
        </button>
      )}
    </div>
  );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="py-16 px-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-error" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-bold text-text text-base">Something went wrong</h3>
        <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">
          We couldn&apos;t load this content. Please try again.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-surface border border-border text-text text-sm font-semibold rounded-xl hover:bg-surface2 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
