"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Lock,
  Camera, CheckCircle2, AlertCircle, Briefcase,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { setProfile: setGlobalProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    city: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loaded = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (loaded.current) return;
        loaded.current = true;
        if (!session?.user) { setLoading(false); return; }
        await loadProfile(supabase, session.user);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(supabase: any, user: any) {
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();

    setUser(user);
    setProfile(prof);
    setForm({
      displayName: prof?.display_name ?? "",
      phone: prof?.phone ?? "",
      city: prof?.city ?? "",
      newPassword: "",
      confirmPassword: "",
    });
    setAvatarPreview(prof?.avatar_url ?? null);
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!user) return;
    setError("");

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.newPassword && form.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Upload avatar if changed
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarFile) {
        // Always use .jpg path so upsert reliably overwrites the same file
        const path = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!uploadError) {
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          // Append timestamp so browsers never serve the old cached image
          avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
        }
      }

      // Upsert profile — must include email because the column is NOT NULL
      // and upsert may insert a new row if one doesn't exist yet
      const { error: profileError } = await (supabase as any).from("profiles").upsert({
        id: user.id,
        email: user.email,
        display_name: form.displayName,
        phone: form.phone,
        city: form.city,
        avatar_url: avatarUrl,
      }, { onConflict: "id" });

      if (profileError) throw profileError;

      // Update password if provided
      if (form.newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password: form.newPassword });
        if (pwError) throw pwError;
      }

      // Push updated profile into global store so profile page reflects
      // changes instantly without needing a reload
      const updatedProfile = {
        ...profile,
        display_name: form.displayName,
        phone: form.phone,
        city: form.city,
        avatar_url: avatarUrl,
      };
      setProfile(updatedProfile);
      setGlobalProfile(updatedProfile);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push("/profile");
      }, 1800);
    } catch (err: any) {
      setError(err.message ?? "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = (form.displayName || "U")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Success overlay */}
      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(10,10,11,0.85)" }}
        >
          <div className="bg-surface rounded-2xl p-8 text-center border border-border">
            <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-bold text-text text-lg">Profile updated!</p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center hover:bg-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-bold text-text">Edit Profile</h1>
        </div>
      </div>

      <div className="p-4 space-y-5 pb-10">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" strokeWidth={2} />
            <p className="text-red-500 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Avatar */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <p className="text-sm font-semibold text-text mb-4">Profile Photo</p>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-xl">{initials}</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white"
                style={{ background: "#FF6A3D" }}
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">{form.displayName || "User"}</p>
              <p className="text-xs text-muted mt-0.5">Tap camera to change photo</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
          <p className="text-sm font-semibold text-text">Basic Information</p>

          <FormField icon={User} label="Display Name" name="displayName"
            type="text" value={form.displayName} onChange={handleChange} placeholder="Your name" />
          <FormField icon={Mail} label="Email" name="email"
            type="email" value={user.email} onChange={() => {}} placeholder="your@email.com"
            disabled hint="Email cannot be changed" />
        </div>

        {/* Contact */}
        <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
          <p className="text-sm font-semibold text-text">Contact Information</p>

          <FormField icon={Phone} label="Phone Number" name="phone"
            type="tel" value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" />
          <FormField icon={MapPin} label="City" name="city"
            type="text" value={form.city} onChange={handleChange} placeholder="Lahore" />
        </div>

        {/* Change password */}
        <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
          <p className="text-sm font-semibold text-text">Change Password</p>

          <FormField icon={Lock} label="New Password" name="newPassword"
            type="password" value={form.newPassword} onChange={handleChange} placeholder="Leave blank to keep current" />
          <FormField icon={Lock} label="Confirm Password" name="confirmPassword"
            type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm new password" />
        </div>

        {/* Organiser switch */}
        {profile?.role === "user" && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text mb-0.5">Organiser Account</h3>
                <p className="text-sm text-muted mb-3">
                  Switch to create events and sell tickets with 0% commission
                </p>
                <button
                  onClick={() => router.push("/profile/become-organiser")}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#FF6A3D" }}
                >
                  Become an Organiser
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all"
          style={{ background: saving ? "#2A2A30" : "#FF6A3D", color: saving ? "#6B7280" : "#FAFAFA" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function FormField({
  icon: Icon, label, name, type, value, onChange, placeholder, disabled, hint,
}: {
  icon: any; label: string; name: string; type: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={2} />
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-text placeholder:text-muted outline-none transition-all"
          style={{
            background: disabled ? "#111113" : "#1A1A1E",
            border: "1px solid #2A2A30",
            color: disabled ? "#6B7280" : "#FAFAFA",
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={(e) => !disabled && (e.currentTarget.style.borderColor = "#FF6A3D")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A30")}
        />
      </div>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
