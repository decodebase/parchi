"use client";

export const runtime = 'edge';

import { use, useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { EventWithTiers, TicketTier } from "@/lib/types/database";
import { Tag, X, Mail, ArrowRight, KeyRound, Loader2, CheckCircle2, XCircle, Ticket, AlertTriangle, Banknote, CreditCard } from "lucide-react";

interface Props {
  params: Promise<{ eventId: string }>;
}

type Step = "select" | "auth" | "confirm" | "processing" | "success" | "error";
type AuthPhase = "email" | "otp";
type TierSelection = Record<string, number>;

interface ActiveDiscount {
  discount_id: string;
  label: string;
  discounted_price: number;
  quantity_remaining: number;
}

interface TierDiscountMap {
  [tierId: string]: ActiveDiscount | null;
}

interface PromoResult {
  id: string;
  discount_type: "percent" | "flat";
  discount_value: number;
  code: string;
}

function CheckoutContent({ params }: Props) {
  const { eventId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedTierId = searchParams.get("tierId");

  const [event, setEvent] = useState<EventWithTiers | null>(null);
  const [selections, setSelections] = useState<TierSelection>({});
  const [step, setStep] = useState<Step>("select");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");

  // Discounts
  const [tierDiscounts, setTierDiscounts] = useState<TierDiscountMap>({});

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Auth (guest sign-in)
  const [authPhase, setAuthPhase] = useState<AuthPhase>("email");
  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);
  const [otpSession, setOtpSession] = useState<any>(null); // session from OTP verify

  // ── Load event + check auth ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Check if already logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      // If not logged in, user stays null — auth step will handle it
    });

    supabase
      .from("events")
      .select("*, ticket_tiers(*), profiles(display_name)")
      .eq("id", eventId)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { router.replace("/"); return; }
        setEvent(data as EventWithTiers);

        if (preselectedTierId) {
          setSelections({ [preselectedTierId]: 1 });
        }

        const tiers = (data as EventWithTiers).ticket_tiers ?? [];
        const discountMap: TierDiscountMap = {};
        await Promise.all(tiers.map(async (tier) => {
          try {
            const { data: discRaw } = await (supabase as any).rpc("get_active_discount", { p_tier_id: tier.id });
            const disc = Array.isArray(discRaw) && discRaw.length > 0 ? discRaw[0] as ActiveDiscount : null;
            discountMap[tier.id] = disc;
          } catch {
            discountMap[tier.id] = null;
          }
        }));
        setTierDiscounts(discountMap);
        setLoading(false);
      });
  }, [eventId, preselectedTierId, router]);

  const tiers: TicketTier[] = [...(event?.ticket_tiers ?? [])].sort((a, b) => a.price - b.price);
  const selectedItems = tiers.filter(t => (selections[t.id] ?? 0) > 0);

  function effectivePrice(tier: TicketTier): number {
    const disc = tierDiscounts[tier.id];
    return disc ? disc.discounted_price : tier.price;
  }

  const totalAmountBeforePromo = selectedItems.reduce(
    (sum, tier) => sum + effectivePrice(tier) * (selections[tier.id] ?? 0), 0
  );

  function applyPromo(amount: number): number {
    if (!promoResult) return amount;
    if (promoResult.discount_type === "percent") {
      return Math.max(0, Math.round(amount * (1 - promoResult.discount_value / 100)));
    }
    return Math.max(0, amount - promoResult.discount_value);
  }

  const totalAmount = applyPromo(totalAmountBeforePromo);
  const totalTickets = selectedItems.reduce((sum, tier) => sum + (selections[tier.id] ?? 0), 0);
  const isFree = totalAmount === 0;
  const hasSelection = totalTickets > 0;
  const promoSaving = totalAmountBeforePromo - totalAmount;

  function setQty(tierId: string, qty: number) {
    setSelections(prev => {
      if (qty <= 0) { const next = { ...prev }; delete next[tierId]; return next; }
      return { ...prev, [tierId]: qty };
    });
  }

  // ── Auth: send OTP ────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      // Use signInWithOtp with no emailRedirectTo — this tells Supabase
      // to send a numeric OTP token instead of a magic link URL.
      // Requires: Auth > Email > "Confirm email" ON in Supabase dashboard.
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          // Do NOT pass emailRedirectTo — its presence triggers magic link mode
        },
      });
      if (error) throw error;
      setAuthPhase("otp");
      setAuthSuccess(true);
    } catch (e: any) {
      setAuthError(e.message ?? "Failed to send code. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Auth: verify OTP ─────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!authOtp.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: authEmail.trim().toLowerCase(),
        token: authOtp.trim(),
        type: "email",
      });
      if (error) throw error;
      if (data.user && data.session) {
        // Explicitly set the session so the cookie is written for middleware
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        setUser(data.user);
        setOtpSession(data.session);
        setStep("confirm");
      }
    } catch (e: any) {
      setAuthError(e.message ?? "Invalid code. Check your email and try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Promo code ────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const supabase = createClient();
      const { data: codeRaw, error } = await supabase
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, max_uses, uses_count, valid_from, valid_until, is_active")
        .eq("event_id", eventId)
        .eq("code", promoInput.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !codeRaw) { setPromoError("Invalid or expired promo code"); return; }

      const code = codeRaw as any;
      const now = new Date();
      if (code.valid_from && new Date(code.valid_from) > now) { setPromoError("This promo code is not active yet"); return; }
      if (code.valid_until && new Date(code.valid_until) < now) { setPromoError("This promo code has expired"); return; }
      if (code.max_uses !== null && code.uses_count >= code.max_uses) { setPromoError("This promo code has reached its usage limit"); return; }

      setPromoResult({ id: code.id, discount_type: code.discount_type, discount_value: code.discount_value, code: code.code });
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => { setPromoResult(null); setPromoInput(""); setPromoError(""); };

  // ── Handle Continue button ────────────────────────────────────
  const handleContinue = () => {
    if (!hasSelection) return;
    if (!user) {
      setStep("auth");
    } else {
      setStep("confirm");
    }
  };

  // ── Purchase ─────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    if (!hasSelection || !user) return;
    setStep("processing");
    try {
      const supabase = createClient();
      // Use OTP session directly if available (freshest token)
      // Fall back to refreshSession for already-logged-in users
      let session = otpSession;
      if (!session) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }
      if (!session) {
        const fallback = await supabase.auth.getSession();
        session = fallback.data.session;
      }
      if (!session) throw new Error("Not authenticated");

      const purchaseCalls = selectedItems.map(tier =>
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/purchase-ticket`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session!.access_token}`,
            },
            body: JSON.stringify({
              eventId,
              tierId: tier.id,
              quantity: selections[tier.id],
              paymentMethod: isFree ? undefined : paymentMethod,
              promoCodeId: promoResult?.id ?? undefined,
              discountId: tierDiscounts[tier.id]?.discount_id ?? undefined,
            }),
          }
        ).then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Purchase failed");
          return data;
        })
      );

      const results = await Promise.all(purchaseCalls);
      const firstOrderId = results[0]?.orderId ?? null;
      if (results[0]?.status === "pending_payment") { router.push(`/payment/${firstOrderId}`); return; }
      setOrderId(firstOrderId);
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong");
      setStep("error");
    }
  }, [selectedItems, user, otpSession, eventId, selections, hasSelection, router, isFree, paymentMethod, promoResult, tierDiscounts]);

  // ── Full-screen steps ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface2 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!event) return null;

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-12 h-12 border-2 border-surface2 border-t-primary rounded-full animate-spin" />
        <p className="text-text font-semibold text-lg">Processing your order…</p>
        <p className="text-muted text-sm text-center">Please don&apos;t close this page</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} className="text-success" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-text font-bold text-2xl">You&apos;re In!</h1>
          <p className="text-muted text-sm">Your parchi{totalTickets > 1 ? "s are" : " is"} ready. See you at the event!</p>
          {!isFree && paymentMethod === "cash" && (
            <div className="flex items-center justify-center gap-2 mt-2 p-3 bg-warning/10 border border-warning/20 rounded-xl">
              <AlertTriangle size={15} className="text-warning shrink-0" />
              <p className="text-warning text-sm font-medium">Pay PKR {(totalAmount / 100).toLocaleString()} in cash at the door.</p>
            </div>
          )}
        </div>
        <button onClick={() => router.push("/my-parchi")}
          className="w-full max-w-xs py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Ticket size={18} />
          View My Parchi
        </button>
        <button onClick={() => router.push("/")} className="text-muted text-sm underline underline-offset-2">
          Back to events
        </button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 bg-error/15 rounded-full flex items-center justify-center">
          <XCircle size={40} className="text-error" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-text font-bold text-xl">Purchase Failed</h1>
          <p className="text-muted text-sm">{errorMsg}</p>
        </div>
        <button onClick={() => setStep("select")}
          className="w-full max-w-xs py-3.5 bg-surface border border-border text-text font-semibold rounded-xl hover:bg-surface2 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header title="Confirm Order" onBack={() => setStep(user ? "select" : "auth")} />
        <div className="flex-1 px-4 py-6 space-y-5 max-w-lg mx-auto w-full">
          <div className="bg-surface rounded-2xl border border-border/60 overflow-hidden">
            <div className="p-5 space-y-4">
              <h2 className="font-bold text-text text-base">{event.title}</h2>
              <div className="space-y-2.5">
                {selectedItems.map(tier => {
                  const disc = tierDiscounts[tier.id];
                  const effPrice = effectivePrice(tier);
                  return (
                    <div key={tier.id} className="space-y-0.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text font-medium">{tier.name}</span>
                        <span className="text-muted">{effPrice === 0 ? "Free" : `PKR ${(effPrice / 100).toLocaleString()}`} × {selections[tier.id]}</span>
                        <span className="text-text font-semibold">{effPrice === 0 ? "Free" : `PKR ${((effPrice * (selections[tier.id] ?? 0)) / 100).toLocaleString()}`}</span>
                      </div>
                      {disc && <p className="text-success text-xs flex items-center gap-1"><Tag size={10} /> {disc.label} — was PKR {(tier.price / 100).toLocaleString()}</p>}
                    </div>
                  );
                })}
                {promoResult && promoSaving > 0 && (
                  <div className="flex items-center justify-between text-sm text-success">
                    <span>Promo ({promoResult.code})</span>
                    <span>− PKR {(promoSaving / 100).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2.5">
                  <SummaryRow label={`Total (${totalTickets} ticket${totalTickets > 1 ? "s" : ""})`} value={isFree ? "Free" : `PKR ${(totalAmount / 100).toLocaleString()}`} highlight />
                </div>
              </div>
            </div>
          </div>

          {!isFree && (
            <div className="space-y-3">
              <p className="text-text font-semibold text-sm">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMethod("cash")}
                  className={cn("p-4 rounded-xl border-2 text-left transition-all",
                    paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border/60 bg-surface")}>
                  <Banknote size={22} className={cn("mb-1", paymentMethod === "cash" ? "text-primary" : "text-muted")} strokeWidth={1.5} />
                  <p className="text-text font-semibold text-sm">Pay at Door</p>
                  <p className="text-muted text-xs mt-0.5">Cash on arrival</p>
                </button>
                <button disabled className="p-4 rounded-xl border-2 border-border/60 bg-surface text-left opacity-40 cursor-not-allowed">
                  <CreditCard size={22} className="text-muted mb-1" strokeWidth={1.5} />
                  <p className="text-text font-semibold text-sm">Online</p>
                  <p className="text-muted text-xs mt-0.5">Coming soon</p>
                </button>
              </div>
            </div>
          )}

          {!isFree && paymentMethod === "cash" && (
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <p className="text-warning text-sm font-medium flex items-center gap-2">
                <Banknote size={15} className="shrink-0" />
                Your parchi will be generated now. Pay PKR {(totalAmount / 100).toLocaleString()} in cash at the venue entrance.
              </p>
            </div>
          )}

          <button onClick={handlePurchase}
            className="w-full py-4 bg-primary text-white font-bold text-base rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all">
            {isFree ? "Confirm & Get Parchi" : paymentMethod === "cash" ? `Confirm — Pay PKR ${(totalAmount / 100).toLocaleString()} at Door` : `Pay PKR ${(totalAmount / 100).toLocaleString()}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: select (+ inline auth panel if needed) ─────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Get Parchi" onBack={() => step === "auth" ? setStep("select") : router.back()} />

      <div className="flex-1 px-4 py-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Event header */}
        <div className="space-y-1">
          <p className="text-muted text-xs uppercase tracking-wider font-medium">Event</p>
          <h2 className="text-text font-bold text-lg leading-snug">{event.title}</h2>
          <p className="text-muted text-sm">📍 {event.venue}, {event.city}</p>
        </div>

        {/* Tier selection */}
        <div className="space-y-2.5">
          <p className="text-text font-semibold text-sm">{tiers.length > 1 ? "Select Tickets" : "Tickets"}</p>
          {tiers.map(tier => {
            const avail = tier.total_quantity - tier.sold_quantity;
            const soldOut = avail <= 0;
            const qty = selections[tier.id] ?? 0;
            const maxQty = Math.min(10, avail);
            const isSelected = qty > 0;
            const disc = tierDiscounts[tier.id];
            const effPrice = effectivePrice(tier);

            return (
              <div key={tier.id}
                className={cn(
                  "relative flex items-stretch rounded-2xl overflow-hidden border transition-all bg-[#111114]",
                  soldOut ? "opacity-40 border-border/30" : isSelected ? "border-primary" : "border-border/50"
                )}
              >
                {/* Left — tier info */}
                <div className="flex-1 px-4 py-3 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-semibold", soldOut ? "text-muted" : "text-text")}>
                      {tier.name}
                    </p>
                    {!soldOut && avail <= 10 && (
                      <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                        {avail} left
                      </span>
                    )}
                    {soldOut && (
                      <span className="text-[9px] font-medium text-muted bg-surface2 px-1.5 py-0.5 rounded-full">
                        Sold out
                      </span>
                    )}
                  </div>
                  {disc ? (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-success/15 text-success rounded-full">{disc.label}</span>
                      <span className="text-muted text-xs line-through">PKR {(tier.price / 100).toLocaleString()}</span>
                      <span className="text-success font-bold text-sm">PKR {(disc.discounted_price / 100).toLocaleString()}</span>
                      <span className="text-muted text-[9px]">({disc.quantity_remaining} left)</span>
                    </div>
                  ) : (
                    <p className={cn("text-sm font-bold mt-0.5", soldOut ? "text-muted" : tier.price === 0 ? "text-success" : "text-primary")}>
                      {tier.price === 0 ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
                    </p>
                  )}
                </div>

                {/* Tear line */}
                <div className="relative flex flex-col items-center justify-center w-4 shrink-0">
                  <div className="absolute top-0 w-3 h-3 bg-background rounded-full -mt-1.5" />
                  <div className="flex-1 border-l border-dashed border-border/40" />
                  <div className="absolute bottom-0 w-3 h-3 bg-background rounded-full -mb-1.5" />
                </div>

                {/* Right — qty selector */}
                <div className="flex items-center justify-center px-3 py-3 shrink-0">
                  {soldOut ? (
                    <span className="text-muted text-xs font-medium w-20 text-center">Sold Out</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(tier.id, qty - 1)} disabled={qty <= 0}
                        className="w-7 h-7 rounded-full bg-surface2 border border-border/60 text-text font-bold flex items-center justify-center hover:bg-border/40 transition-colors disabled:opacity-25 text-sm">
                        −
                      </button>
                      <span className="text-text font-bold text-sm w-5 text-center tabular-nums">{qty}</span>
                      <button onClick={() => setQty(tier.id, qty + 1)} disabled={qty >= maxQty}
                        className="w-7 h-7 rounded-full bg-surface2 border border-border/60 text-text font-bold flex items-center justify-center hover:bg-border/40 transition-colors disabled:opacity-25 text-sm">
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo code — only shown if logged in */}
        {hasSelection && user && (
          <div className="space-y-2">
            <p className="text-text font-semibold text-sm flex items-center gap-1.5">
              <Tag size={13} className="text-primary" /> Have a promo code?
            </p>
            {promoResult ? (
              <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-xl">
                <div>
                  <p className="text-success text-sm font-bold">{promoResult.code} applied ✓</p>
                  <p className="text-success text-xs">
                    {promoResult.discount_type === "percent" ? `${promoResult.discount_value}% off` : `PKR ${(promoResult.discount_value / 100).toLocaleString()} off`}
                    {promoSaving > 0 && ` — saving PKR ${(promoSaving / 100).toLocaleString()}`}
                  </p>
                </div>
                <button onClick={removePromo} className="text-muted hover:text-error transition-colors"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                  placeholder="Enter code (e.g. LAUNCH20)"
                  className="flex-1 px-3.5 py-2.5 bg-surface border border-border rounded-xl text-text text-sm placeholder:text-muted font-mono tracking-wider uppercase focus:outline-none focus:border-primary/60 transition-colors" />
                <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {promoLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {promoError && <p className="text-error text-xs">{promoError}</p>}
          </div>
        )}

        {/* Order summary */}
        {hasSelection && (
          <div className="p-4 bg-surface rounded-xl border border-border/60 space-y-2">
            {selectedItems.map(tier => {
              const effPrice = effectivePrice(tier);
              return (
                <div key={tier.id} className="flex justify-between text-sm">
                  <span className="text-muted">{tier.name} × {selections[tier.id]}</span>
                  <span className="text-text font-medium">{effPrice === 0 ? "Free" : `PKR ${((effPrice * (selections[tier.id] ?? 0)) / 100).toLocaleString()}`}</span>
                </div>
              );
            })}
            {promoResult && promoSaving > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Promo ({promoResult.code})</span>
                <span>− PKR {(promoSaving / 100).toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-border pt-2">
              <SummaryRow label={`Total — ${totalTickets} ticket${totalTickets > 1 ? "s" : ""}`} value={isFree ? "Free" : `PKR ${(totalAmount / 100).toLocaleString()}`} highlight />
            </div>
          </div>
        )}

        {/* ── Inline Auth Panel ── */}
        {step === "auth" && !user && (
          <div className="rounded-2xl border border-primary/30 bg-surface overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                  {authPhase === "email" ? <Mail size={14} className="text-primary" /> : <KeyRound size={14} className="text-primary" />}
                </div>
                <p className="text-text font-bold text-sm">
                  {authPhase === "email" ? "Enter your email to continue" : "Check your email"}
                </p>
              </div>
              <p className="text-muted text-xs">
                {authPhase === "email"
                  ? "We'll send a one-time code to verify it's you. No password needed."
                  : `We sent an 8-digit code to ${authEmail}. Enter it below.`}
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {authError && (
                <div className="px-3 py-2.5 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-error text-xs">{authError}</p>
                </div>
              )}

              {authPhase === "email" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wider">Email address</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                      placeholder="you@example.com"
                      autoFocus
                      className="w-full px-3.5 py-3 bg-surface2 border border-border rounded-xl text-text text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={authLoading || !authEmail.trim()}
                    className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send Code</span><ArrowRight size={15} /></>}
                  </button>
                </>
              ) : (
                <>
                  {authSuccess && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-lg">
                      <span className="text-success text-xs">✓ Code sent to {authEmail}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wider">8-digit code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={authOtp}
                      onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                      placeholder="00000000"
                      autoFocus
                      className="w-full px-3.5 py-3 bg-surface2 border border-border rounded-xl text-text text-xl font-mono tracking-[0.4em] text-center placeholder:text-muted placeholder:tracking-normal focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={authLoading || authOtp.length < 8}
                    className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {authLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify & Continue</span><ArrowRight size={15} /></>}
                  </button>
                  <button
                    onClick={() => { setAuthPhase("email"); setAuthOtp(""); setAuthError(""); setAuthSuccess(false); }}
                    className="w-full text-muted text-xs text-center hover:text-text transition-colors"
                  >
                    Wrong email? Go back
                  </button>
                </>
              )}

              <p className="text-muted text-[11px] text-center">
                Already have an account?{" "}
                <button onClick={() => router.push(`/auth/login?redirect=/checkout/${eventId}`)} className="text-primary underline underline-offset-2">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 px-4 pb-6 pt-3 bg-background/90 backdrop-blur-sm border-t border-border/40">
        {step !== "auth" ? (
          <button
            onClick={handleContinue}
            disabled={!hasSelection}
            className="w-full py-4 bg-primary text-white font-bold text-base rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasSelection ? `Continue — ${totalTickets} ticket${totalTickets > 1 ? "s" : ""}` : "Select tickets to continue"}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-muted text-xs">Complete sign-in above to proceed</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border/40">
      <button onClick={onBack}
        className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-text hover:bg-surface transition-colors"
        aria-label="Go back">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-text font-bold text-lg">{title}</h1>
    </div>
  );
}

export default function CheckoutPage({ params }: Props) {
  return (
    <Suspense>
      <CheckoutContent params={params} />
    </Suspense>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-sm">{label}</span>
      <span className={cn("text-sm font-semibold", highlight ? "text-primary text-base font-bold" : "text-text")}>{value}</span>
    </div>
  );
}
