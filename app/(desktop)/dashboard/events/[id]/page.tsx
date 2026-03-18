import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { Event, TicketTier, Order, Ticket } from "@/lib/types/database";
import { Ticket as TicketIcon, CheckSquare, Banknote, BarChart2, ScanLine, Megaphone, Eye, MapPin, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { PublishButton } from "./PublishButton";
import { DiscountsPanel } from "./DiscountsPanel";
import { PromoCodesPanel } from "./PromoCodesPanel";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export const runtime = 'edge';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("title").eq("id", id).maybeSingle();
  const row = data as { title: string } | null;
  return { title: row?.title ? `${row.title} — Dashboard` : "Event — Dashboard" };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
}
function formatPKR(paisas: number) {
  return `PKR ${(paisas / 100).toLocaleString("en-PK")}`;
}

export default async function EventManagePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: event, error } = await supabase
    .from("events")
    .select("*, ticket_tiers(*)")
    .eq("id", id)
    .eq("organiser_id", user.id)
    .maybeSingle();

  if (error || !event) notFound();

  const e = event as unknown as Event & { ticket_tiers: TicketTier[] };
  const tiers = e.ticket_tiers ?? [];

  const [ordersRes, ticketsRes, promosRes, discountsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("event_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("tickets").select("status").eq("event_id", id),
    supabase.from("promo_codes").select("*").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("ticket_discounts").select("*").eq("event_id", id).order("created_at", { ascending: false }),
  ]);

  const orders = (ordersRes.data ?? []) as Order[];
  const tickets = (ticketsRes.data ?? []) as Pick<Ticket, "status">[];
  const promoCodes = (promosRes.data ?? []) as any[];
  const discounts = (discountsRes.data ?? []) as any[];

  const totalSold = tickets.filter((t) => t.status === "valid" || t.status === "used").length;
  const totalUsed = tickets.filter((t) => t.status === "used").length;
  const totalCap = tiers.reduce((s, t) => s + t.total_quantity, 0);
  const paidOrders = orders.filter((o) => o.status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total_amount, 0);
  const totalOriginalRevenue = paidOrders.reduce((s, o: any) => s + (o.original_amount ?? o.total_amount), 0);
  const totalDiscountGiven = totalOriginalRevenue - totalRevenue;

  const now = new Date();
  const eventStart = new Date(e.event_date);
  const eventEnd = e.end_date ? new Date(e.end_date) : null;
  const isPast = eventEnd ? eventEnd < now : eventStart < now;

  return (
    <div className="space-y-8 max-w-5xl">
      {created && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-xl text-success text-sm font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Event created successfully! It will be reviewed before being published.</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={e.status} />
            {isPast && <span className="text-xs px-2.5 py-1 rounded-full bg-surface2 text-muted border border-border/40">Ended</span>}
          </div>
          <h1 className="text-text font-bold text-2xl leading-tight">{e.title}</h1>
          <div className="flex items-center gap-1.5 text-muted text-sm"><MapPin size={13} /><span>{e.venue}, {e.city}</span></div>
          <div className="flex items-center gap-1.5 text-subtle text-sm">
            <CalendarDays size={13} />
            <span>{formatDate(e.event_date)} · {formatTime(e.event_date)}</span>
          </div>
          {e.end_date && (
            <div className="flex items-center gap-1.5 text-subtle text-sm">
              <Clock size={13} />
              <span>Ends {formatDate(e.end_date)} · {formatTime(e.end_date)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href={`/events/${e.id}`} target="_blank"
            className="px-4 py-2 bg-surface border border-border text-text text-sm font-medium rounded-xl hover:bg-surface2 transition-colors">
            View Public Page ↗
          </Link>
          <PublishButton eventId={e.id} status={e.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPI label="Tickets Sold" value={`${totalSold} / ${totalCap}`} icon={TicketIcon} />
        <MiniKPI label="Checked In" value={`${totalUsed}`} icon={CheckSquare} />
        <MiniKPI
          label="Revenue"
          value={formatPKR(totalRevenue)}
          sub={totalDiscountGiven > 0 ? `${formatPKR(totalDiscountGiven)} in discounts` : undefined}
          icon={Banknote}
        />
        <MiniKPI label="Capacity" value={`${totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0}%`} icon={BarChart2} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-text font-bold text-base">Ticket Tiers</h2>
            {tiers.length === 0 ? (
              <p className="text-muted text-sm">No ticket tiers configured.</p>
            ) : (
              <div className="bg-surface rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
                {tiers.map((tier) => {
                  const avail = tier.total_quantity - tier.sold_quantity;
                  const pct = tier.total_quantity > 0 ? (tier.sold_quantity / tier.total_quantity) * 100 : 0;
                  return (
                    <div key={tier.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-text text-sm">{tier.name}</p>
                          {tier.description && <p className="text-muted text-xs">{tier.description}</p>}
                        </div>
                        <p className="font-bold text-primary text-sm">
                          {tier.price === 0 ? "Free" : formatPKR(tier.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <p className="text-muted text-xs shrink-0">{tier.sold_quantity} sold · {avail} left</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DiscountsPanel eventId={id} tiers={tiers.map(t => ({ id: t.id, name: t.name, price: t.price }))} initialDiscounts={discounts} />

          <PromoCodesPanel eventId={id} organiserId={user.id} initialCodes={promoCodes} />

          <div className="space-y-3">
            <h2 className="text-text font-bold text-base">Recent Orders</h2>
            {orders.length === 0 ? (
              <div className="py-8 text-center bg-surface rounded-xl border border-border/40">
                <p className="text-muted text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border/60 overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_80px] gap-4 px-4 py-3 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted font-medium">
                  <span>Order ID</span><span>Amount</span><span>Status</span>
                </div>
                <div className="divide-y divide-border/40">
                  {orders.map((order: any) => {
                    const hasDiscount = order.original_amount && order.original_amount !== order.total_amount;
                    return (
                      <div key={order.id} className="grid grid-cols-[1fr_150px_80px] gap-4 items-center px-4 py-3">
                        <div>
                          <p className="font-mono text-text text-xs">#{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-muted text-[11px]">{new Date(order.created_at ?? Date.now()).toLocaleDateString("en-PK")}</p>
                        </div>
                        <div>
                          {order.status === "paid" ? (
                            <div>
                              <p className="text-text text-xs font-semibold">{formatPKR(order.total_amount)}</p>
                              {hasDiscount && (
                                <p className="text-muted text-[11px] line-through">{formatPKR(order.original_amount)}</p>
                              )}
                            </div>
                          ) : <p className="text-text text-xs">—</p>}
                        </div>
                        <OrderStatusDot status={order.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border/60 p-4 space-y-2">
            <p className="text-text font-semibold text-sm mb-2">Quick Actions</p>
            <ActionLink href={`/dashboard/scanner?eventId=${e.id}`} icon={ScanLine} label="Open Scanner" />
            <ActionLink href={`/dashboard/promote?eventId=${e.id}`} icon={Megaphone} label="Promote Event" />
            <ActionLink href={`/events/${e.id}`} icon={Eye} label="Preview Public Page" external />
          </div>

          <div className="bg-surface rounded-xl border border-border/60 p-4 space-y-3">
            <p className="text-text font-semibold text-sm">Event Details</p>
            <DetailRow label="Categories" value={(e.categories ?? []).join(", ")} />
            <DetailRow label="City" value={e.city} />
            {e.address && <DetailRow label="Address" value={e.address} />}
            <DetailRow label="Created" value={new Date(e.created_at).toLocaleDateString("en-PK")} />
          </div>

          {e.tags && e.tags.length > 0 && (
            <div className="bg-surface rounded-xl border border-border/60 p-4 space-y-2">
              <p className="text-text font-semibold text-sm">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {e.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2.5 py-1 bg-surface2 text-muted rounded-full border border-border/40">#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-success/15 text-success",
    approved:  "bg-primary/15 text-primary",
    pending:   "bg-warning/15 text-warning",
    draft:     "bg-surface2 text-muted border border-border",
    cancelled: "bg-error/15 text-error",
    completed: "bg-surface2 text-subtle",
  };
  const label: Record<string, string> = {
    published: "Live", approved: "Approved", pending: "Pending Review",
    draft: "Draft", cancelled: "Cancelled", completed: "Completed",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}

function MiniKPI({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-surface rounded-xl border border-border/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Icon size={18} className="text-primary" strokeWidth={1.8} />
        <p className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</p>
      </div>
      <p className="text-text font-bold text-xl">{value}</p>
      {sub && <p className="text-muted text-[11px]">{sub}</p>}
    </div>
  );
}

function OrderStatusDot({ status }: { status: string }) {
  const map: Record<string, string> = { paid: "text-success", pending: "text-warning", failed: "text-error", refunded: "text-muted", cancelled: "text-muted" };
  return <p className={`text-xs font-semibold capitalize ${map[status] ?? "text-muted"}`}>{status}</p>;
}

function ActionLink({ href, icon: Icon, label, external }: { href: string; icon: React.ElementType; label: string; external?: boolean }) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Link href={href} {...props} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface2 hover:bg-border/30 text-text text-sm font-medium transition-colors">
      <Icon size={14} className="text-muted shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
      <span className="text-muted text-xs">{external ? "↗" : "→"}</span>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted text-xs">{label}</p>
      <p className="text-text text-xs font-semibold capitalize truncate max-w-[60%] text-right">{value}</p>
    </div>
  );
}
