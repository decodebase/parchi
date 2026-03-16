import type { Metadata } from "next";
export const metadata: Metadata = { title: "Reels — Parchi" };

export default function ReelsPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <span className="text-6xl">🎬</span>
      <h1 className="text-2xl font-bold text-text">Reels</h1>
      <p className="text-muted text-sm max-w-xs">
        Short video reels from events are coming soon. You'll be able to discover events through creator content here.
      </p>
    </div>
  );
}
