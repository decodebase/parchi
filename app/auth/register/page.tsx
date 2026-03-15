"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, KeyRound } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "otp">("form");

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: signUp() — Supabase sends ONE "Confirm signup" email with {{ .Token }} ──
  // No signInWithOtp() here — that would send a second conflicting email.
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          // No emailRedirectTo — keeps it as OTP token mode, not magic link
        },
      });
      if (signUpError) throw signUpError;
      setPhase("otp");
    } catch (err: any) {
      setError(err.message ?? "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verifyOtp type "signup" — confirms the account and logs user in ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.trim().length < 6) { setError("Enter the full code from your email"); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "signup",
      });
      if (verifyError) throw verifyError;
      // Write session cookie so middleware sees user as logged in immediately
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      // Full reload so middleware picks up the new session cookie
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message ?? "Invalid code. Check your email and try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all bg-[#1A1A1E] border border-[#2A2A30] text-[#FAFAFA] placeholder:text-[#4B5563] focus:border-primary";

  // ── OTP phase ─────────────────────────────────────────────────
  if (phase === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0B]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={24} className="text-primary" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#FAFAFA]">Verify your email</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              We sent a code to <strong className="text-[#9CA3AF]">{email}</strong>
            </p>
          </div>

          <div className="rounded-2xl p-6 bg-[#111113] border border-[#2A2A30]">
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="00000000"
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-xl font-mono tracking-[0.4em] text-center outline-none transition-all bg-[#1A1A1E] border border-[#2A2A30] text-[#FAFAFA] placeholder:text-[#4B5563] focus:border-[#FF6A3D]"
                  onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#2A2A30")}
                />
                <p className="text-[#6B7280] text-xs mt-2">Enter the code from your email. It expires in 1 hour.</p>
              </div>
              <button
                type="submit"
                disabled={loading || otp.trim().length < 6}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: loading || otp.trim().length < 6 ? "#2A2A30" : "#FF6A3D",
                  color: loading || otp.trim().length < 6 ? "#6B7280" : "#FAFAFA",
                  cursor: loading || otp.trim().length < 6 ? "not-allowed" : "pointer",
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify & Continue</span><ArrowRight size={15} /></>}
              </button>
            </form>
          </div>

          <button
            onClick={() => { setPhase("form"); setOtp(""); setError(null); }}
            className="mt-4 w-full text-center text-sm text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
          >
            ← Back to sign up
          </button>
        </div>
      </div>
    );
  }

  // ── Sign up form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0A0A0B]">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-[#FAFAFA]">parchi</span><span className="text-[#FF6A3D]">.pk</span>
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">Create your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 bg-[#111113] border border-[#2A2A30]">
          <form onSubmit={handleSignUp} className="space-y-5">
            {error && (
              <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-[#9CA3AF]">Display name</label>
              <input id="name" type="text" autoComplete="name" required value={displayName}
                onChange={e => setDisplayName(e.target.value)} placeholder="Your name"
                className={inputClass}
                onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A30")} />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#9CA3AF]">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className={inputClass}
                onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A30")} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-[#9CA3AF]">Password</label>
              <input id="password" type="password" autoComplete="new-password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                className={inputClass}
                onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A30")} />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-2 text-[#9CA3AF]">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" required value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className={inputClass}
                onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
                onBlur={e => (e.currentTarget.style.borderColor = "#2A2A30")} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: loading ? "#2A2A30" : "#FF6A3D",
                color: loading ? "#6B7280" : "#FAFAFA",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-[#FF6A3D]">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
