// src/screens/StoryViewer.jsx
// Full-screen story viewer. Tap left/right to navigate, tap X to close.
// Progress bar auto-advances after 5 seconds per story.

import { useState, useEffect, useRef } from "react";

const STORY_DURATION = 5000; // ms per story

export default function StoryViewer({ group, onClose, onViewed }) {
  const [idx, setIdx]         = useState(0);
  const [progress, setProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const timerRef              = useRef(null);
  const progressRef           = useRef(null);
  const startRef              = useRef(null);

  const story = group.stories[idx];
  const r     = group.restaurant;
  const total = group.stories.length;

  // Mark current story as viewed
  useEffect(() => {
    if (!story) return;
    if (onViewed) onViewed(story.id);
  }, [story?.id]);

  // Reset error state when navigating to a new story
  useEffect(() => { setImgError(false); }, [idx]);

  // Auto-advance timer
  useEffect(() => {
    setProgress(0);
    startRef.current = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct     = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [idx]);

  function goNext() {
    if (idx < total - 1) setIdx(idx + 1);
    else onClose();
  }

  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
    else setIdx(0);
  }

  function handleTap(e) {
    const x    = e.clientX;
    const half = window.innerWidth / 2;
    if (x < half) goPrev();
    else goNext();
  }

  function timeLeft(expiresAt) {
    const ms = new Date(expiresAt) - new Date();
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h left`;
    if (m > 0) return `${m}m left`;
    return "Expiring soon";
  }

  if (!story) return null;

  return (
    <div style={S.overlay} onClick={handleTap}>

      {/* Progress bars */}
      <div style={S.progressRow}>
        {group.stories.map((_, i) => (
          <div key={i} style={S.progressTrack}>
            <div style={{
              ...S.progressFill,
              width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={S.header} onClick={e => e.stopPropagation()}>
        <div style={S.avatar}>{r.icon}</div>
        <div style={S.meta}>
          <div style={S.rname}>{r.name}</div>
          <div style={S.expiry}>{timeLeft(story.expires_at)}</div>
        </div>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Image */}
      {imgError ? (
        <div style={{ ...S.image, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ fontSize: 36 }}>🖼️</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "0 24px" }}>
            Image unavailable{"\n"}(storage bucket may not be public)
          </div>
        </div>
      ) : (
        <img
          src={story.image_url}
          alt=""
          style={S.image}
          onError={() => setImgError(true)}
        />
      )}

      {/* Caption */}
      {story.caption && (
        <div style={S.caption} onClick={e => e.stopPropagation()}>
          {story.caption}
        </div>
      )}

      {/* Tap zones (invisible) */}
      <div style={S.tapLeft}  onClick={e => { e.stopPropagation(); goPrev(); }} />
      <div style={S.tapRight} onClick={e => { e.stopPropagation(); goNext(); }} />
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "#000", zIndex: 300,
    display: "flex", flexDirection: "column",
    maxWidth: 430, margin: "0 auto",
  },
  progressRow: {
    display: "flex", gap: 4, padding: "52px 16px 8px", zIndex: 2,
  },
  progressTrack: {
    flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "#fff", borderRadius: 2,
    transition: "width 50ms linear",
  },
  header: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 16px 12px", zIndex: 2,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    background: "rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  meta: { flex: 1 },
  rname: { fontSize: 13, fontWeight: 700, color: "#fff" },
  expiry: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)", border: "none",
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  image: {
    width: "100%", flex: 1, objectFit: "cover",
  },
  caption: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: "60px 20px 40px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
    fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.5,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  tapLeft: {
    position: "absolute", top: 100, left: 0, width: "35%",
    bottom: 120, zIndex: 1,
  },
  tapRight: {
    position: "absolute", top: 100, right: 0, width: "65%",
    bottom: 120, zIndex: 1,
  },
};
