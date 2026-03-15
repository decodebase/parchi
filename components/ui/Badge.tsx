import { cn } from "@/lib/utils/cn";
import type { EventCategory, EventStatus, TicketStatus, OrderStatus } from "@/lib/types/database";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface2 text-subtle border border-border",
  primary: "bg-primary-muted text-primary border border-primary/20",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  error: "bg-error/10 text-error border border-error/20",
  muted: "bg-surface2 text-muted border border-border/50",
};

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Convenience badges

export function StatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; variant: BadgeVariant }> = {
    draft:     { label: "Draft",     variant: "muted" },
    pending:   { label: "Pending",   variant: "warning" },
    approved:  { label: "Approved",  variant: "primary" },
    published: { label: "Published", variant: "success" },
    cancelled: { label: "Cancelled", variant: "error" },
    completed: { label: "Completed", variant: "default" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
    valid:    { label: "Valid",    variant: "success" },
    used:     { label: "Used",     variant: "muted" },
    cancelled:{ label: "Cancelled",variant: "error" },
    refunded: { label: "Refunded", variant: "warning" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
    pending:   { label: "Pending",   variant: "warning" },
    paid:      { label: "Paid",      variant: "success" },
    failed:    { label: "Failed",    variant: "error" },
    refunded:  { label: "Refunded",  variant: "warning" },
    cancelled: { label: "Cancelled", variant: "error" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function CategoryBadge({ category }: { category: EventCategory | string | null }) {
  if (!category) return null;
  const emoji: Record<string, string> = {
    music:       "🎵",
    food:        "🍜",
    sports:      "⚽",
    arts:        "🎨",
    comedy:      "😂",
    networking:  "🤝",
    conference:  "💼",
    festival:    "🎉",
    nightlife:   "🌃",
    family:      "👨‍👩‍👧",
    general:     "📅",
    tech:        "💻",
  };
  return (
    <Badge variant="default">
      <span>{emoji[category] ?? "📅"}</span>
      <span className="capitalize">{category}</span>
    </Badge>
  );
}
