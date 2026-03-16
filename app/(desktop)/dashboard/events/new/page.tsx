"use client";

export const runtime = 'edge';

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { EventCategory } from "@/lib/types/database";
import {
  Music, Utensils, Trophy, Palette, Laugh, Users, Mic2, Sparkles,
  Moon, Heart, Star, ImagePlus, Video, MapPin, LocateFixed, Search,
  Plus, Trash2, Tag,
} from "lucide-react";

const CATEGORIES: { value: EventCategory; label: string; icon: React.ElementType }[] = [
  { value: "music",       label: "Music",       icon: Music },
  { value: "food",        label: "Food",        icon: Utensils },
  { value: "sports",      label: "Sports",      icon: Trophy },
  { value: "arts",        label: "Arts",        icon: Palette },
  { value: "comedy",      label: "Comedy",      icon: Laugh },
  { value: "networking",  label: "Networking",  icon: Users },
  { value: "conference",  label: "Conference",  icon: Mic2 },
  { value: "festival",    label: "Festival",    icon: Sparkles },
  { value: "nightlife",   label: "Nightlife",   icon: Moon },
  { value: "family",      label: "Family",      icon: Heart },
  { value: "general",     label: "General",     icon: Star },
];

// ── Leaflet Map Picker ──────────────────────────────────────────────
function MapPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css"; link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        await new Promise<void>((res) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => res();
          document.head.appendChild(script);
        });
      }
      const L = (window as any).L;
      if (!mapRef.current || mapInstanceRef.current) return;
      const initLat = lat ?? 31.5204;
      const initLng = lng ?? 74.3587;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([initLat, initLng], 13);
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;background:#FF6A3D;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24], className: "",
      });
      if (lat !== null && lng !== null) {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", (e: any) => {
          const pos = e.target.getLatLng();
          onPick(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        });
      }
      map.on("click", (e: any) => {
        const { lat: clat, lng: clng } = e.latlng;
        if (markerRef.current) { markerRef.current.setLatLng([clat, clng]); }
        else {
          markerRef.current = L.marker([clat, clng], { icon, draggable: true }).addTo(map);
          markerRef.current.on("dragend", (ev: any) => {
            const pos = ev.target.getLatLng();
            onPick(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
          });
        }
        onPick(parseFloat(clat.toFixed(6)), parseFloat(clng.toFixed(6)));
      });
    };
    loadLeaflet();
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapInstanceRef.current || !L || lat === null || lng === null) return;
    mapInstanceRef.current.setView([lat, lng], 15);
    if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); }
    else {
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;background:#FF6A3D;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24], className: "",
      });
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onPick(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
      });
    }
  }, [lat, lng]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat: rlat, lon: rlng } = results[0];
        onPick(parseFloat(parseFloat(rlat).toFixed(6)), parseFloat(parseFloat(rlng).toFixed(6)));
      }
    } finally { setSearching(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search for a place, area, or address…"
          className={inputClass}
        />
        <button type="button" onClick={handleSearch} disabled={searching}
          className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
          {searching ? <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
        </button>
      </div>
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-border/60" style={{ height: 280 }} />
      <p className="text-[11px] text-muted">
        Click on the map or drag the pin to set the exact location.
        {lat !== null && lng !== null && <span className="ml-2 font-mono text-primary">{lat}, {lng}</span>}
      </p>
    </div>
  );
}

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "Quetta", "Multan", "Hyderabad", "Sialkot"];

interface DiscountSlot {
  id: string;
  label: string;
  discountedPrice: string;
  quantityAvailable: string;
  startsDate: string;
  startsTime: string;
  endsDate: string;
  endsTime: string;
}

function makeDiscount(): DiscountSlot {
  return {
    id: crypto.randomUUID(),
    label: "Early Bird",
    discountedPrice: "0",
    quantityAvailable: "50",
    startsDate: "",
    startsTime: "00:00",
    endsDate: "",
    endsTime: "23:59",
  };
}

interface TierDraft {
  id: string;
  name: string;
  description: string;
  price: string;
  total_quantity: string;
  discountsEnabled: boolean;
  discounts: DiscountSlot[];
}

function makeTier(): TierDraft {
  return {
    id: crypto.randomUUID(),
    name: "", description: "", price: "100", total_quantity: "100",
    discountsEnabled: false, discounts: [],
  };
}

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<EventCategory[]>(["general"]);
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Karachi");
  const [address, setAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("18:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("22:00");
  const [coverImage, setCoverImage] = useState("");
  const [promoVideo, setPromoVideo] = useState("");
  const [tags, setTags] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [tiers, setTiers] = useState<TierDraft[]>([makeTier()]);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const addTier = () => setTiers((t) => [...t, makeTier()]);
  const removeTier = (id: string) => setTiers((t) => t.filter((x) => x.id !== id));
  const updateTier = (id: string, field: keyof TierDraft, value: any) =>
    setTiers((t) => t.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const toggleCategory = (cat: EventCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
  };

  const toggleDiscounts = (tierId: string) => {
    setTiers((t) => t.map((x) => {
      if (x.id !== tierId) return x;
      const enabling = !x.discountsEnabled;
      return {
        ...x,
        discountsEnabled: enabling,
        discounts: enabling && x.discounts.length === 0 ? [makeDiscount()] : enabling ? x.discounts : [],
      };
    }));
  };

  const addDiscount = (tierId: string) =>
    setTiers((t) => t.map((x) => x.id === tierId ? { ...x, discounts: [...x.discounts, makeDiscount()] } : x));
  const removeDiscount = (tierId: string, discId: string) =>
    setTiers((t) => t.map((x) => x.id === tierId ? { ...x, discounts: x.discounts.filter((d) => d.id !== discId) } : x));
  const updateDiscount = (tierId: string, discId: string, field: keyof DiscountSlot, value: string) =>
    setTiers((t) => t.map((x) => x.id === tierId ? {
      ...x,
      discounts: x.discounts.map((d) => d.id === discId ? { ...d, [field]: value } : d),
    } : x));

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setLng(parseFloat(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  const handleSubmit = async (status: "draft" | "pending") => {
    setError("");
    if (!title.trim()) return setError("Event title is required");
    if (!venue.trim()) return setError("Venue is required");
    if (!eventDate) return setError("Event date is required");
    if (endDate && endTime && eventDate) {
      const start = new Date(`${eventDate}T${eventTime}:00`);
      const end = new Date(`${endDate}T${endTime}:00`);
      if (end <= start) return setError("End date/time must be after start date/time");
    }
    if (tiers.some((t) => !t.name.trim())) return setError("All ticket tiers need a name");

    for (const tier of tiers) {
      if (tier.discountsEnabled) {
        for (const d of tier.discounts) {
          if (!d.startsDate || !d.endsDate) return setError(`Discount "${d.label}" needs start and end dates`);
          const dp = parseFloat(tier.price || "0");
          const discP = parseFloat(d.discountedPrice || "0");
          if (discP >= dp && dp > 0) return setError(`Discount price for "${d.label}" must be less than the tier price`);
        }
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const combinedStart = new Date(`${eventDate}T${eventTime}:00`).toISOString();
      const combinedEnd = endDate ? new Date(`${endDate}T${endTime}:00`).toISOString() : null;

      let finalCoverImage = coverImage.trim() || null;
      if (bannerFile) {
        setUploadProgress("Uploading banner image…");
        const ext = bannerFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: bannerErr } = await supabase.storage.from("event-banners").upload(path, bannerFile, { upsert: false, contentType: bannerFile.type });
        if (bannerErr) throw new Error("Banner upload failed: " + bannerErr.message);
        const { data: { publicUrl } } = supabase.storage.from("event-banners").getPublicUrl(path);
        finalCoverImage = publicUrl;
      }

      let finalPromoVideo = promoVideo.trim() || null;
      if (videoFile) {
        setUploadProgress("Uploading promo video…");
        const ext = videoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: videoErr } = await supabase.storage.from("event-videos").upload(path, videoFile, { upsert: false, contentType: videoFile.type });
        if (videoErr) throw new Error("Video upload failed: " + videoErr.message);
        const { data: { publicUrl } } = supabase.storage.from("event-videos").getPublicUrl(path);
        finalPromoVideo = publicUrl;
      }

      setUploadProgress("Creating event…");
      const { data: event, error: eventErr } = await (supabase as any)
        .from("events")
        .insert({
          organiser_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: categories[0],
          tags: [...categories.slice(1), ...tags.split(",").map((t) => t.trim()).filter(Boolean)],
          venue: venue.trim(),
          city,
          address: address.trim() || null,
          event_date: combinedStart,
          end_date: combinedEnd,
          status,
          cover_image: finalCoverImage,
          promo_video_url: finalPromoVideo,
          is_featured: false,
          lat: lat ?? null,
          lng: lng ?? null,
        })
        .select()
        .single();

      if (eventErr || !event) throw new Error(eventErr?.message ?? "Failed to create event");

      setUploadProgress("Creating ticket tiers…");
      for (const t of tiers) {
        const { data: tierRow, error: tierErr } = await (supabase as any)
          .from("ticket_tiers")
          .insert({
            event_id: event.id,
            name: t.name.trim(),
            description: t.description.trim() || null,
            price: Math.round(parseFloat(t.price || "0") * 100),
            total_quantity: parseInt(t.total_quantity || "0", 10),
          })
          .select()
          .single();
        if (tierErr || !tierRow) throw new Error(tierErr?.message ?? "Failed to create tier");

        if (t.discountsEnabled && t.discounts.length > 0) {
          const discountInserts = t.discounts.map((d) => ({
            tier_id: tierRow.id,
            event_id: event.id,
            label: d.label.trim() || "Discount",
            discounted_price: Math.round(parseFloat(d.discountedPrice || "0") * 100),
            quantity_available: parseInt(d.quantityAvailable || "0", 10),
            starts_at: new Date(`${d.startsDate}T${d.startsTime}:00`).toISOString(),
            ends_at: new Date(`${d.endsDate}T${d.endsTime}:00`).toISOString(),
            is_active: true,
          }));
          await (supabase as any).from("ticket_discounts").insert(discountInserts);
        }
      }

      router.push(`/dashboard/events/${event.id}?created=1`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setSaving(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-text font-bold text-xl">Create New Event</h1>
        <p className="text-muted text-sm mt-1">Fill in the details below. You can save as draft and publish later.</p>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm">⚠️ {error}</div>
      )}

      <Section title="Basic Info">
        <Field label="Event Title *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Coke Studio Live Karachi" className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell attendees what to expect..." rows={4} className={inputClass} />
        </Field>
        <Field label="Category * (select one or more)">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const selected = categories.includes(cat.value);
              return (
                <button key={cat.value} type="button" onClick={() => toggleCategory(cat.value)}
                  className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
                    selected ? "bg-primary/10 border-primary text-primary" : "bg-surface2 border-border text-muted hover:border-primary/40 hover:text-text"
                  )}>
                  <Icon size={13} />{cat.label}
                  {selected && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Banner Image">
          <div className="space-y-3">
            <div onClick={() => bannerInputRef.current?.click()}
              className={cn("relative w-full h-40 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors",
                bannerPreview ? "border-primary/40" : "border-border/60 hover:border-primary/40 bg-surface2"
              )}>
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
                  <ImagePlus size={28} strokeWidth={1.5} />
                  <p className="text-sm font-medium">Click to upload banner</p>
                  <p className="text-xs">JPG, PNG, WebP — 16:9 recommended</p>
                </div>
              )}
              <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); setCoverImage(""); }} />
            </div>
            {bannerPreview && <button type="button" onClick={() => { setBannerFile(null); setBannerPreview(""); }} className="text-xs text-muted hover:text-error transition-colors">Remove image</button>}
            <p className="text-[11px] text-muted">Or paste a URL:</p>
            <input value={coverImage} onChange={(e) => { setCoverImage(e.target.value); if (e.target.value) { setBannerFile(null); setBannerPreview(""); } }} placeholder="https://..." className={inputClass} />
          </div>
        </Field>

        <Field label="Promo Video">
          <div className="space-y-3">
            <div onClick={() => videoInputRef.current?.click()}
              className={cn("relative w-full h-28 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors",
                videoName ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/40 bg-surface2"
              )}>
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
                {videoName ? (<><Video size={24} strokeWidth={1.5} /><p className="text-sm font-medium text-text truncate max-w-[80%]">{videoName}</p></>) : (
                  <><Video size={28} strokeWidth={1.5} /><p className="text-sm font-medium">Click to upload promo video</p><p className="text-xs">MP4 or WebM — max 100MB</p></>
                )}
              </div>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setVideoFile(f); setVideoName(f.name); setPromoVideo(""); }} />
            </div>
            {videoName && <button type="button" onClick={() => { setVideoFile(null); setVideoName(""); }} className="text-xs text-muted hover:text-error transition-colors">Remove video</button>}
            <input value={promoVideo} onChange={(e) => { setPromoVideo(e.target.value); if (e.target.value) { setVideoFile(null); setVideoName(""); } }} placeholder="https://... (mp4 or YouTube embed)" className={inputClass} />
          </div>
        </Field>

        <Field label="Tags (comma separated)">
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. live music, outdoor, karachi" className={inputClass} />
        </Field>
      </Section>

      <Section title="Location & Date">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Venue Name *">
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Frere Hall" className={inputClass} />
          </Field>
          <Field label="City *">
            <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address for maps" className={inputClass} />
        </Field>

        <Field label="Pin Location on Map (optional)">
          <div className="space-y-3">
            <button type="button" onClick={useCurrentLocation} disabled={locating}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50">
              {locating ? <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              {locating ? "Detecting location…" : "Use my current location"}
            </button>
            <MapPicker lat={lat} lng={lng} onPick={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
            {lat !== null && lng !== null && (
              <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:text-primary/80">
                <MapPin className="w-3 h-3" /> Verify on Google Maps
              </a>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date *">
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Start Time *">
            <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="End Date">
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={eventDate || undefined} className={inputClass} />
          </Field>
          <Field label="End Time">
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <p className="text-[11px] text-muted">
          Event status will automatically change to <strong>Completed</strong> after the end date/time passes.
          If no end date is set, the event date is used.
        </p>
      </Section>

      <Section title="Ticket Tiers">
        <div className="space-y-5">
          {tiers.map((tier, i) => (
            <div key={tier.id} className="p-4 bg-surface2 rounded-xl border border-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-text text-sm font-semibold">Tier {i + 1}</p>
                {tiers.length > 1 && (
                  <button type="button" onClick={() => removeTier(tier.id)} className="text-muted text-xs hover:text-error transition-colors">Remove</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tier Name *">
                  <input value={tier.name} onChange={(e) => updateTier(tier.id, "name", e.target.value)} placeholder="e.g. General Admission" className={inputClass} />
                </Field>
                <Field label="Quantity *">
                  <input type="number" min="1" value={tier.total_quantity} onChange={(e) => updateTier(tier.id, "total_quantity", e.target.value)} className={inputClass} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (PKR)">
                  <input type="number" min="0" step="50" value={tier.price} onChange={(e) => updateTier(tier.id, "price", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Description (optional)">
                  <input value={tier.description} onChange={(e) => updateTier(tier.id, "description", e.target.value)} placeholder="e.g. Includes welcome drink" className={inputClass} />
                </Field>
              </div>

              {/* Timed Discounts — only shown for paid tiers */}
              {parseFloat(tier.price || "0") > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => toggleDiscounts(tier.id)}
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative cursor-pointer",
                        tier.discountsEnabled ? "bg-primary" : "bg-surface border border-border"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        tier.discountsEnabled ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </div>
                    <span className="text-text text-xs font-semibold flex items-center gap-1.5">
                      <Tag size={12} className="text-primary" />
                      Apply Timed Discounts
                    </span>
                  </label>

                  {tier.discountsEnabled && (
                    <div className="space-y-3">
                      {tier.discounts.map((disc, di) => (
                        <div key={disc.id} className="p-3.5 bg-surface rounded-xl border border-primary/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-primary text-xs font-semibold">Discount Slot {di + 1}</p>
                            <button type="button" onClick={() => removeDiscount(tier.id, disc.id)}
                              className="text-muted hover:text-error transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Label">
                              <input value={disc.label} onChange={(e) => updateDiscount(tier.id, disc.id, "label", e.target.value)}
                                placeholder="e.g. Early Bird" className={inputClass} />
                            </Field>
                            <Field label="Discounted Price (PKR)">
                              <input type="number" min="0" value={disc.discountedPrice}
                                onChange={(e) => updateDiscount(tier.id, disc.id, "discountedPrice", e.target.value)} className={inputClass} />
                            </Field>
                          </div>

                          <Field label="Quantity Available for this Discount">
                            <input type="number" min="1" value={disc.quantityAvailable}
                              onChange={(e) => updateDiscount(tier.id, disc.id, "quantityAvailable", e.target.value)} className={inputClass} />
                          </Field>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Starts Date">
                              <input type="date" value={disc.startsDate} onChange={(e) => updateDiscount(tier.id, disc.id, "startsDate", e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Starts Time">
                              <input type="time" value={disc.startsTime} onChange={(e) => updateDiscount(tier.id, disc.id, "startsTime", e.target.value)} className={inputClass} />
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Ends Date">
                              <input type="date" value={disc.endsDate} onChange={(e) => updateDiscount(tier.id, disc.id, "endsDate", e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Ends Time">
                              <input type="time" value={disc.endsTime} onChange={(e) => updateDiscount(tier.id, disc.id, "endsTime", e.target.value)} className={inputClass} />
                            </Field>
                          </div>

                          <p className="text-[11px] text-muted">
                            Discount ends when either the time expires <strong>or</strong> {disc.quantityAvailable} tickets at this price are sold — whichever comes first.
                          </p>
                        </div>
                      ))}

                      <button type="button" onClick={() => addDiscount(tier.id)}
                        className="flex items-center gap-2 px-3 py-2 border border-dashed border-primary/40 rounded-lg text-primary text-xs font-medium hover:bg-primary/5 transition-colors">
                        <Plus size={13} /> Add Another Discount Slot
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <button type="button" onClick={addTier}
            className="w-full py-3 border-2 border-dashed border-border/60 rounded-xl text-muted text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors">
            + Add Another Tier
          </button>
        </div>
      </Section>

      {uploadProgress && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm font-medium flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {uploadProgress}
        </div>
      )}

      <div className="flex items-center gap-3 pb-10">
        <button type="button" onClick={() => handleSubmit("draft")} disabled={saving}
          className="px-6 py-3 bg-surface border border-border text-text text-sm font-semibold rounded-xl hover:bg-surface2 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save as Draft"}
        </button>
        <button type="button" onClick={() => handleSubmit("pending")} disabled={saving}
          className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Submitting…" : "Submit for Review"}
        </button>
        <button type="button" onClick={() => router.back()} className="ml-auto text-muted text-sm hover:text-text transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputClass = "w-full px-3.5 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/60 bg-surface2/50">
        <h2 className="text-text font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
