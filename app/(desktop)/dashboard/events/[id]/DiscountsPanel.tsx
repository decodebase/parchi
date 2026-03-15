"use client";

/**
 * DiscountsPanel.tsx
 * Organiser-facing timed discount manager per ticket tier.
 * Shows all discount slots for all tiers of the event.
 * Allows adding, editing, toggling active/inactive, and deleting.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TicketTierBasic {
  id: string;
  name: string;
  price: number;
}

interface Discount {
  id: string;
  tier_id: string;
  label: string;
  discounted_price: number;
  quantity_available: number;
  quantity_used: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

interface Props {
  eventId: string;
  tiers: TicketTierBasic[];
  initialDiscounts: Discount[];
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function isLive(d: Discount): boolean {
  if (!d.is_active) return false;
  const now = new Date();
  return new Date(d.starts_at) <= now && new Date(d.ends_at) >= now && d.quantity_used < d.quantity_available;
}

function isExpired(d: Discount): boolean {
  return new Date(d.ends_at) < new Date() || d.quantity_used >= d.quantity_available;
}

export function DiscountsPanel({ eventId, tiers, initialDiscounts }: Props) {
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id ?? "");
  const [label, setLabel] = useState("Early Bird");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [quantityAvailable, setQuantityAvailable] = useState("50");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedTier = tiers.find(t => t.id === selectedTierId);
  const paidTiers = tiers.filter(t => t.price > 0);

  const resetForm = () => {
    setLabel("Early Bird");
    setDiscountedPrice("");
    setQuantityAvailable("50");
    setStartsAt("");
    setEndsAt("");
    setSelectedTierId(paidTiers[0]?.id ?? "");
    setError("");
    setEditingId(null);
  };

  const handleSave = async () => {
    setError("");
    if (!selectedTierId) return setError("Select a tier");
    if (!label.trim()) return setError("Label is required");
    if (!discountedPrice) return setError("Discounted price is required");
    if (!startsAt || !endsAt) return setError("Start and end times are required");
    if (new Date(endsAt) <= new Date(startsAt)) return setError("End must be after start");

    const tier = tiers.find(t => t.id === selectedTierId);
    const discP = Math.round(parseFloat(discountedPrice) * 100);
    if (tier && discP >= tier.price) return setError(`Discounted price must be less than PKR ${(tier.price / 100).toLocaleString()}`);

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tier_id: selectedTierId,
        event_id: eventId,
        label: label.trim(),
        discounted_price: discP,
        quantity_available: parseInt(quantityAvailable, 10),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        is_active: true,
      };

      if (editingId) {
        const { data, error: err } = await (supabase as any)
          .from("ticket_discounts")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();
        if (err) throw new Error(err.message);
        setDiscounts(prev => prev.map(d => d.id === editingId ? data as Discount : d));
      } else {
        const { data, error: err } = await (supabase as any)
          .from("ticket_discounts")
          .insert(payload)
          .select()
          .single();
        if (err) throw new Error(err.message);
        setDiscounts(prev => [data as Discount, ...prev]);
      }

      setShowForm(false);
      resetForm();
    } catch (e: any) {
      setError(e.message ?? "Failed to save discount");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient();
    await (supabase as any).from("ticket_discounts").update({ is_active: !current }).eq("id", id);
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d));
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Delete this discount slot?")) return;
    const supabase = createClient();
    await (supabase as any).from("ticket_discounts").delete().eq("id", id);
    setDiscounts(prev => prev.filter(d => d.id !== id));
  };

  const startEdit = (d: Discount) => {
    setSelectedTierId(d.tier_id);
    setLabel(d.label);
    setDiscountedPrice(String(d.discounted_price / 100));
    setQuantityAvailable(String(d.quantity_available));
    // Convert ISO to datetime-local format
    const toLocal = (iso: string) => {
      const dt = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    setStartsAt(toLocal(d.starts_at));
    setEndsAt(toLocal(d.ends_at));
    setEditingId(d.id);
    setShowForm(true);
    setError("");
  };

  if (paidTiers.length === 0) return null;

  // Group discounts by tier
  const byTier: Record<string, Discount[]> = {};
  discounts.forEach(d => {
    if (!byTier[d.tier_id]) byTier[d.tier_id] = [];
    byTier[d.tier_id].push(d);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-text font-bold text-base flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          Timed Discounts
        </h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Plus size={12} />
          {showForm ? "Cancel" : "Add Discount"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="p-4 bg-surface rounded-xl border border-primary/20 space-y-4">
          <p className="text-text text-sm font-semibold">{editingId ? "Edit Discount Slot" : "New Discount Slot"}</p>

          {error && <p className="text-error text-xs bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Ticket Tier</label>
            <select value={selectedTierId} onChange={e => setSelectedTierId(e.target.value)} className={inputClass}>
              {paidTiers.map(t => (
                <option key={t.id} value={t.id}>{t.name} — PKR {(t.price / 100).toLocaleString()}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Early Bird" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                Discounted Price (PKR)
                {selectedTier && <span className="ml-1 text-muted normal-case">max PKR {(selectedTier.price / 100 - 1).toLocaleString()}</span>}
              </label>
              <input type="number" min="0" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)} placeholder="e.g. 500" className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Quantity at this Price</label>
            <input type="number" min="1" value={quantityAvailable} onChange={e => setQuantityAvailable(e.target.value)} className={inputClass} />
            <p className="text-[11px] text-muted">Discount ends when this many tickets are sold OR the end time passes — whichever comes first.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Starts At</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Ends At</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Discount"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="px-5 py-2.5 bg-surface2 border border-border text-text text-sm font-semibold rounded-xl hover:bg-border/30 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Discounts grouped by tier */}
      {discounts.length === 0 ? (
        <div className="py-8 text-center bg-surface rounded-xl border border-border/40">
          <Tag size={24} className="text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-muted text-sm">No timed discounts yet</p>
          <p className="text-muted text-xs mt-1">Add early-bird or flash sale pricing per tier</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paidTiers.map(tier => {
            const tierDiscs = byTier[tier.id] ?? [];
            if (tierDiscs.length === 0) return null;
            return (
              <div key={tier.id} className="space-y-2">
                <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                  {tier.name} — PKR {(tier.price / 100).toLocaleString()}
                </p>
                <div className="bg-surface rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
                  {tierDiscs.map(d => {
                    const live = isLive(d);
                    const expired = isExpired(d);
                    const statusLabel = live ? "Live" : expired ? "Expired" : !d.is_active ? "Disabled" : "Upcoming";
                    const statusCls = live ? "bg-success/15 text-success" : expired ? "bg-surface2 text-muted" : !d.is_active ? "bg-surface2 text-muted" : "bg-warning/15 text-warning";
                    const remaining = d.quantity_available - d.quantity_used;

                    return (
                      <div key={d.id} className={cn("p-3.5 space-y-2", !d.is_active && "opacity-60")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-text font-semibold text-sm">{d.label}</p>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusCls)}>{statusLabel}</span>
                            </div>
                            <p className="text-primary font-bold text-sm mt-0.5">
                              PKR {(d.discounted_price / 100).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => startEdit(d)} title="Edit"
                              className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-text text-xs transition-colors">
                              ✎
                            </button>
                            <button onClick={() => toggleActive(d.id, d.is_active)} title={d.is_active ? "Disable" : "Enable"}
                              className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-text transition-colors">
                              {d.is_active ? <ToggleRight size={14} className="text-primary" /> : <ToggleLeft size={14} />}
                            </button>
                            <button onClick={() => deleteDiscount(d.id)} title="Delete"
                              className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-error transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={10} />{fmtDT(d.starts_at)} → {fmtDT(d.ends_at)}</span>
                          <span className="flex items-center gap-1"><Users size={10} />{d.quantity_used} / {d.quantity_available} sold ({remaining} left)</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1 bg-surface2 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (d.quantity_used / d.quantity_available) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full px-3.5 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors";
