"use client";

/**
 * PromoCodesPanel.tsx
 * Organiser-facing promo code manager on the event detail page.
 * Lets organisers generate, view, toggle, and delete promo codes.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tag, Plus, Copy, Trash2, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "flat";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  eventId: string;
  organiserId: string;
  initialCodes: PromoCode[];
}

function generateCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function PromoCodesPanel({ eventId, organiserId, initialCodes }: Props) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState(() => generateCode());
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const handleCreate = async () => {
    setError("");
    if (!code.trim()) return setError("Code is required");
    const val = parseInt(discountValue, 10);
    if (!val || val <= 0) return setError("Discount value must be greater than 0");
    if (discountType === "percent" && val > 100) return setError("Percent discount cannot exceed 100%");

    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await (supabase as any)
        .from("promo_codes")
        .insert({
          event_id: eventId,
          organiser_id: organiserId,
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discountType === "flat" ? val * 100 : val, // flat = paisas, percent = integer
          max_uses: maxUses ? parseInt(maxUses, 10) : null,
          valid_from: validFrom ? new Date(validFrom).toISOString() : null,
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
          is_active: true,
        })
        .select()
        .single();

      if (err) throw new Error(err.message);
      setCodes((prev) => [data as PromoCode, ...prev]);
      setShowForm(false);
      // Reset form
      setCode(generateCode());
      setDiscountType("percent");
      setDiscountValue("20");
      setMaxUses("");
      setValidFrom("");
      setValidUntil("");
    } catch (e: any) {
      setError(e.message ?? "Failed to create promo code");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient();
    await (supabase as any).from("promo_codes").update({ is_active: !current }).eq("id", id);
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    const supabase = createClient();
    await (supabase as any).from("promo_codes").delete().eq("id", id);
    setCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c).then(() => {
      setCopied(c);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  function formatDiscount(code: PromoCode) {
    if (code.discount_type === "percent") return `${code.discount_value}% off`;
    return `PKR ${(code.discount_value / 100).toLocaleString()} off`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-text font-bold text-base flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          Promo Codes
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Plus size={12} />
          New Code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="p-4 bg-surface rounded-xl border border-primary/20 space-y-4">
          <p className="text-text text-sm font-semibold">Create Promo Code</p>

          {error && (
            <p className="text-error text-xs bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Code input + regenerate */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Code</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH20"
                className={inputClass + " font-mono tracking-widest uppercase"}
              />
              <button
                type="button"
                onClick={() => setCode(generateCode())}
                title="Generate random code"
                className="px-3 py-2 bg-surface2 border border-border text-muted rounded-lg hover:text-text hover:border-primary/40 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Discount Type</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["percent", "flat"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDiscountType(t)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-semibold transition-colors",
                      discountType === t ? "bg-primary text-white" : "bg-surface2 text-muted hover:text-text"
                    )}
                  >
                    {t === "percent" ? "% Percent" : "PKR Flat"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">
                {discountType === "percent" ? "Percent Off (1–100)" : "Amount Off (PKR)"}
              </label>
              <input
                type="number"
                min="1"
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Max uses */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Max Uses (leave blank for unlimited)</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="e.g. 100"
              className={inputClass}
            />
          </div>

          {/* Valid window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Valid From (optional)</label>
              <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Valid Until (optional)</label>
              <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating…" : "Create Code"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-5 py-2.5 bg-surface2 border border-border text-text text-sm font-semibold rounded-xl hover:bg-border/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Codes list */}
      {codes.length === 0 ? (
        <div className="py-8 text-center bg-surface rounded-xl border border-border/40">
          <Tag size={24} className="text-muted mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-muted text-sm">No promo codes yet</p>
          <p className="text-muted text-xs mt-1">Create codes to give attendees discounts</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
          {codes.map((c) => {
            const usedUp = c.max_uses !== null && c.uses_count >= c.max_uses;
            const expired = c.valid_until && new Date(c.valid_until) < new Date();
            const isEffectivelyActive = c.is_active && !usedUp && !expired;

            return (
              <div key={c.id} className="p-3.5 flex items-center gap-3">
                {/* Code badge */}
                <div className={cn(
                  "flex-1 min-w-0",
                  !isEffectivelyActive && "opacity-50"
                )}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-text tracking-widest text-sm">{c.code}</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      isEffectivelyActive
                        ? "bg-success/15 text-success"
                        : "bg-surface2 text-muted"
                    )}>
                      {usedUp ? "Used Up" : expired ? "Expired" : !c.is_active ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <p className="text-primary text-xs font-semibold mt-0.5">{formatDiscount(c)}</p>
                  <p className="text-muted text-[11px] mt-0.5">
                    {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""} uses
                    {c.valid_until && ` · expires ${new Date(c.valid_until).toLocaleDateString("en-PK")}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyCode(c.code)}
                    title="Copy code"
                    className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-text transition-colors"
                  >
                    {copied === c.code ? <span className="text-[10px] font-bold text-success">✓</span> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => toggleActive(c.id, c.is_active)}
                    title={c.is_active ? "Disable" : "Enable"}
                    className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-text transition-colors"
                  >
                    {c.is_active ? <ToggleRight size={15} className="text-primary" /> : <ToggleLeft size={15} />}
                  </button>
                  <button
                    onClick={() => deleteCode(c.id)}
                    title="Delete"
                    className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-muted hover:text-error transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
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
