"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordReset } from "@/lib/supabase/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0A0A0B" }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <span className="text-3xl font-bold tracking-tight" style={{ color: "#FF6A3D" }}>
            parchi
          </span>
          <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>
            Reset your password
          </p>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: "#111113", border: "1px solid #2A2A30" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(16,185,129,0.1)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#FAFAFA" }}>
              Check your email
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              We sent a reset link to{" "}
              <strong style={{ color: "#9CA3AF" }}>{email}</strong>.
              It expires in 1 hour.
            </p>
            <Link
              href="/auth/login"
              className="text-sm font-medium"
              style={{ color: "#FF6A3D" }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <div
            className="rounded-2xl p-6"
            style={{ background: "#111113", border: "1px solid #2A2A30" }}
          >
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: "#9CA3AF" }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: "#1A1A1E", border: "1px solid #2A2A30", color: "#FAFAFA" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF6A3D")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A30")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
                style={{
                  background: loading ? "#2A2A30" : "#FF6A3D",
                  color: loading ? "#6B7280" : "#FAFAFA",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: "#6B7280" }}>
          <Link href="/auth/login" className="font-medium" style={{ color: "#FF6A3D" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
