"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface EventHeroProps {
  videoUrl: string | null;
  imageUrl: string | null;
  title: string;
}

// ── Extract YouTube video ID from any YouTube URL format ──────────────────────
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // youtube.com/embed/VIDEO_ID
      const match = u.pathname.match(/\/embed\/([^/?]+)/);
      if (match) return match[1];
      // youtube.com/shorts/VIDEO_ID
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {}
  return null;
}

export default function EventHero({ videoUrl, imageUrl, title }: EventHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const isYouTube = !!youtubeId;
  const isDirectVideo = !!videoUrl && !isYouTube;

  const [showImage, setShowImage] = useState(!videoUrl);
  const [videoReady, setVideoReady] = useState(false);

  const revealImage = () => setShowImage(true);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isDirectVideo) return;
    const onReady = () => {
      setVideoReady(true);
      vid.play().catch(revealImage);
    };
    vid.addEventListener("loadedmetadata", onReady);
    vid.addEventListener("error", revealImage);
    return () => {
      vid.removeEventListener("loadedmetadata", onReady);
      vid.removeEventListener("error", revealImage);
    };
  }, [isDirectVideo]);

  return (
    <div className="relative w-full bg-black overflow-hidden"
      style={{ height: "clamp(280px, 45vw, 600px)" }}>

      {/* ── YouTube iframe ── */}
      {isYouTube && (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${youtubeId}`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          style={{ pointerEvents: "none" }}
          title={title}
        />
      )}

      {/* ── Direct video layer ── */}
      {isDirectVideo && (
        <video
          ref={videoRef}
          src={videoUrl!}
          autoPlay
          muted
          playsInline
          onEnded={revealImage}
          onError={revealImage}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: showImage ? 0 : 1,
            transition: "opacity 0.8s ease",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Banner image layer (shown when no video, or after direct video ends) ── */}
      {!isYouTube && (
        <div
          className="absolute inset-0"
          style={{
            opacity: showImage ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="100vw"
              priority={!videoUrl}
            />
          ) : (
            <div className="absolute inset-0 bg-surface2 flex items-center justify-center">
              <svg className="w-16 h-16 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── Gradient fade at bottom ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

      {/* ── Back button ── */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-10 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        aria-label="Go back"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
    </div>
  );
}
