"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import {
  ArrowLeft, Briefcase, CheckCircle2, Ticket, Users, Zap,
  Building2, User, AlertCircle, MapPin, Phone, Hash,
  Upload, Camera, FileText,
} from "lucide-react";

type Step = "info" | "type" | "details" | "documents" | "done";

// ── Reusable field — defined OUTSIDE the page to prevent remount on every render ──
function StepDots({ steps, currentIdx }: { steps: string[]; currentIdx: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="h-1.5 rounded-full transition-all"
          style={{ width: currentIdx === i ? 24 : 8, background: i <= currentIdx ? "#FF6A3D" : "#2A2A30" }} />
      ))}
    </div>
  );
}

function Field({ icon: Icon, label, name, type = "text", value, placeholder, hint, onChange }: {
  icon: any; label: string; name: string; type?: string;
  value: string; placeholder: string; hint?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={2} />
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-text placeholder:text-muted outline-none"
          style={{ background: "#1A1A1E", border: "1px solid #2A2A30" }}
          onFocus={e => (e.currentTarget.style.borderColor = "#FF6A3D")}
          onBlur={e  => (e.currentTarget.style.borderColor = "#2A2A30")}
        />
      </div>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

function IDUploadBox({ side, preview, onUpload }: {
  side: "front" | "back";
  preview: string | null;
  onUpload: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">
        {side === "front" ? "ID Card — Front" : "ID Card — Back"}
      </label>
      <button type="button" onClick={() => ref.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors"
        style={{ borderColor: preview ? "#FF6A3D" : "#2A2A30", background: preview ? "transparent" : "#1A1A1E", minHeight: 120 }}
      >
        {preview ? (
          <img src={preview} alt={`ID ${side}`} className="w-full h-32 object-cover rounded-2xl" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center">
              <Camera className="w-5 h-5 text-muted" strokeWidth={1.8} />
            </div>
            <p className="text-xs text-muted">Tap to upload {side} side</p>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" strokeWidth={2} />
      <p className="text-red-500 text-sm">{msg}</p>
    </div>
  );
}

interface FormState {
  businessType: "individual" | "company";
  // Details step
  fullName: string;
  phone: string;
  city: string;
  address: string;
  // Company only
  companyName: string;
  ntnNumber: string;
  // Documents step
  idFrontFile: File | null;
  idBackFile:  File | null;
  idFrontPreview: string | null;
  idBackPreview:  string | null;
}

export default function BecomeOrganiserPage() {
  const router = useRouter();
  const { setProfile: setGlobalProfile, profile } = useAuthStore();
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    businessType: "individual",
    fullName: "",
    phone: "",
    city: "",
    address: "",
    companyName: "",
    ntnNumber: "",
    idFrontFile: null,
    idBackFile: null,
    idFrontPreview: null,
    idBackPreview: null,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleIDFile(side: "front" | "back", file: File) {
    const preview = URL.createObjectURL(file);
    if (side === "front") setForm(f => ({ ...f, idFrontFile: file, idFrontPreview: preview }));
    else                   setForm(f => ({ ...f, idBackFile:  file, idBackPreview:  preview }));
  }

  function validateDetails() {
    if (!form.fullName.trim())  { setError("Full name is required."); return false; }
    if (!form.phone.trim())     { setError("Phone number is required."); return false; }
    if (!form.city.trim())      { setError("City is required."); return false; }
    if (!form.address.trim())   { setError("Address is required."); return false; }
    if (form.businessType === "company") {
      if (!form.companyName.trim()) { setError("Company name is required."); return false; }
      if (!form.ntnNumber.trim())   { setError("NTN number is required for companies."); return false; }
    }
    return true;
  }

  function validateDocuments() {
    if (!form.idFrontFile) { setError("Please upload the front of your ID card."); return false; }
    if (!form.idBackFile)  { setError("Please upload the back of your ID card."); return false; }
    return true;
  }

  async function handleSubmit() {
    setError("");
    if (!validateDocuments()) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Upload ID card images
      let idFrontUrl: string | null = null;
      let idBackUrl:  string | null = null;

      if (form.idFrontFile) {
        const path = `${user.id}/id-front.jpg`;
        await supabase.storage.from("id-documents").upload(path, form.idFrontFile, { upsert: true });
        const { data } = supabase.storage.from("id-documents").getPublicUrl(path);
        idFrontUrl = data.publicUrl;
      }
      if (form.idBackFile) {
        const path = `${user.id}/id-back.jpg`;
        await supabase.storage.from("id-documents").upload(path, form.idBackFile, { upsert: true });
        const { data } = supabase.storage.from("id-documents").getPublicUrl(path);
        idBackUrl = data.publicUrl;
      }

      // Build notes string with all details
      const notes = [
        `Full Name: ${form.fullName}`,
        `Phone: ${form.phone}`,
        `City: ${form.city}`,
        `Address: ${form.address}`,
        form.businessType === "company" ? `Company: ${form.companyName}` : null,
        form.businessType === "company" ? `NTN: ${form.ntnNumber}` : null,
      ].filter(Boolean).join(" | ");

      // Insert organiser application
      const { error: appErr } = await (supabase as any)
        .from("organiser_applications")
        .insert({
          user_id: user.id,
          business_name: form.businessType === "company" ? form.companyName : form.fullName,
          business_type: form.businessType,
          id_front_url: idFrontUrl,
          id_back_url: idBackUrl,
          notes,
          status: "pending",
        });

      if (appErr) throw appErr;

      // Mark profile as pending + update phone/city from the form
      const { error: profErr } = await (supabase as any)
        .from("profiles")
        .update({
          organiser_status: "pending",
          phone: form.phone,
          city: form.city,
          display_name: form.fullName,
        })
        .eq("id", user.id);

      if (profErr) throw profErr;

      // Sync global store
      if (profile) {
        setGlobalProfile({
          ...profile,
          organiser_status: "pending",
          phone: form.phone,
          city: form.city,
          display_name: form.fullName,
        });
      }

      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step indicator dots
  const STEPS: Step[] = ["type", "details", "documents"];
  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              if (step === "info" || step === "done") router.back();
              else if (step === "type")      setStep("info");
              else if (step === "details")   setStep("type");
              else if (step === "documents") setStep("details");
            }}
            className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center hover:bg-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-bold text-text">Become an Organiser</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ──────────────────────────── STEP: INFO (perks) ───────────────────────────── */}
        {step === "info" && (
          <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-4 py-8 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(255,106,61,0.1)" }}>
                <Briefcase className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Start Organising Events</h2>
              <p className="text-muted text-sm max-w-xs mx-auto">
                Apply for an Organiser account to create events, sell tickets, and build your audience on parchi.pk
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: Ticket, title: "Sell Tickets Easily",  desc: "Create ticket tiers, set prices, and sell instantly with QR codes" },
                { icon: Users,  title: "Reach Your Audience",  desc: "Get discovered by thousands of event-goers in your city" },
                { icon: Zap,    title: "0% Commission",        desc: "Keep all your revenue — we charge zero platform commission" },
              ].map(p => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="flex items-start gap-4 p-4 bg-surface rounded-2xl border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-text text-sm">{p.title}</p>
                      <p className="text-xs text-muted mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setStep("type")} className="w-full py-4 rounded-2xl text-sm font-bold text-white" style={{ background: "#FF6A3D" }}>
              Apply Now →
            </button>
            <p className="text-center text-xs text-muted">Applications are reviewed within 24 hours.</p>
          </motion.div>
        )}

        {/* ──────────────────────────── STEP 1: ACCOUNT TYPE ─────────────────────────── */}
        {step === "type" && (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-4 py-8 space-y-6">
            <StepDots steps={STEPS} currentIdx={currentIdx} />
            <div>
              <h2 className="text-xl font-bold text-text mb-1">Account Type</h2>
              <p className="text-sm text-muted">Are you applying as an individual or a company?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(["individual", "company"] as const).map(type => (
                <button key={type} onClick={() => setForm(f => ({ ...f, businessType: type }))}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all"
                  style={{ background: form.businessType === type ? "rgba(255,106,61,0.08)" : "#1A1A1E", borderColor: form.businessType === type ? "#FF6A3D" : "#2A2A30" }}
                >
                  {type === "individual"
                    ? <User className="w-8 h-8" style={{ color: form.businessType === type ? "#FF6A3D" : "#6B7280" }} strokeWidth={1.6} />
                    : <Building2 className="w-8 h-8" style={{ color: form.businessType === type ? "#FF6A3D" : "#6B7280" }} strokeWidth={1.6} />
                  }
                  <span className="text-sm font-bold" style={{ color: form.businessType === type ? "#FF6A3D" : "#FAFAFA" }}>
                    {type === "individual" ? "Individual" : "Company"}
                  </span>
                  <span className="text-xs text-muted text-center leading-snug">
                    {type === "individual" ? "Solo organiser or freelancer" : "Registered business or brand"}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => { setError(""); setStep("details"); }}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white" style={{ background: "#FF6A3D" }}>
              Next →
            </button>
          </motion.div>
        )}

        {/* ──────────────────────────── STEP 2: DETAILS ─────────────────────────────── */}
        {step === "details" && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-4 py-8 space-y-5">
            <StepDots steps={STEPS} currentIdx={currentIdx} />
            <div>
              <h2 className="text-xl font-bold text-text mb-1">Your Details</h2>
              <p className="text-sm text-muted">We need this to verify your identity.</p>
            </div>

            <Field icon={User}    label="Full Name"     name="fullName" value={form.fullName} placeholder="Muhammad Ahmed"                           onChange={handleChange} />
            <Field icon={Phone}   label="Phone Number" name="phone"    value={form.phone}    placeholder="+92 300 1234567" type="tel"                onChange={handleChange} />
            <Field icon={MapPin}  label="City"         name="city"     value={form.city}     placeholder="Lahore"                                    onChange={handleChange} />
            <Field icon={MapPin}  label="Address"      name="address"  value={form.address}  placeholder="House 12, Street 4, DHA Phase 2"           onChange={handleChange} />

            {form.businessType === "company" && (
              <>
                <Field icon={Building2} label="Company Name" name="companyName" value={form.companyName} placeholder="Parchi Productions Pvt Ltd"   onChange={handleChange} />
                <Field icon={Hash}      label="NTN Number"   name="ntnNumber"   value={form.ntnNumber}   placeholder="1234567-8"
                  hint="National Tax Number — required for registered companies"                                                                     onChange={handleChange} />
              </>
            )}

            {error && <ErrorBox msg={error} />}

            <button
              onClick={() => { if (validateDetails()) { setError(""); setStep("documents"); } }}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white" style={{ background: "#FF6A3D" }}>
              Next →
            </button>
          </motion.div>
        )}

        {/* ──────────────────────────── STEP 3: ID DOCUMENTS ─────────────────────────── */}
        {step === "documents" && (
          <motion.div key="documents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-4 py-8 space-y-5">
            <StepDots steps={STEPS} currentIdx={currentIdx} />
            <div>
              <h2 className="text-xl font-bold text-text mb-1">ID Verification</h2>
              <p className="text-sm text-muted">Upload clear photos of your CNIC / Passport.</p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "rgba(255,106,61,0.06)", border: "1px solid rgba(255,106,61,0.15)" }}>
              <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-xs text-muted leading-relaxed">
                Your ID is stored securely and only seen by the Parchi review team. It will not be shared publicly.
              </p>
            </div>

            <IDUploadBox side="front" preview={form.idFrontPreview} onUpload={f => handleIDFile("front", f)} />
            <IDUploadBox side="back"  preview={form.idBackPreview}  onUpload={f => handleIDFile("back",  f)} />

            {error && <ErrorBox msg={error} />}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all"
              style={{ background: loading ? "#2A2A30" : "#FF6A3D", color: loading ? "#6B7280" : "#FAFAFA" }}
            >
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </motion.div>
        )}

        {/* ──────────────────────────── SUCCESS ──────────────────────────────────── */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#10B981" }} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Application Submitted!</h2>
              <p className="text-muted text-sm mb-8 max-w-xs mx-auto">
                We've received your application and ID. Our team will review it within 24 hours and you'll be notified once approved.
              </p>
              <button onClick={() => router.push("/profile")} className="px-8 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "#FF6A3D" }}>
                Back to Profile
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
