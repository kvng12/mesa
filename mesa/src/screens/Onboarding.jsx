// src/screens/Onboarding.jsx
// Drop this file into: src/screens/Onboarding.jsx

import { useState } from "react";

const SLIDES = [
  {
    bg: "#FF6240",
    emoji: "🍽️",
    headline: "Discover\nLocal Food",
    sub: "Find the best restaurants in Sokoto and Kebbi State — all in one place.",
  },
  {
    bg: "#D97706",
    emoji: "🛵",
    headline: "Order\nwith Ease",
    sub: "Cash or card, pickup or delivery — whatever works for you.",
  },
  {
    bg: "#2D6A4F",
    emoji: "📍",
    headline: "Track in\nReal Time",
    sub: "Watch your order go from kitchen to your door, every step of the way.",
  },
];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last  = step === SLIDES.length - 1;

  return (
    <div style={{ ...S.wrap, background: slide.bg }}>
      {/* Skip */}
      {!last && (
        <button style={S.skip} onClick={onDone}>Skip</button>
      )}

      {/* Illustration */}
      <div style={S.illus}>{slide.emoji}</div>

      {/* Text */}
      <div style={S.bottom}>
        <h1 style={S.headline}>{slide.headline}</h1>
        <p style={S.sub}>{slide.sub}</p>

        {/* Dots */}
        <div style={S.dots}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ ...S.dot, background: i === step ? "#fff" : "rgba(255,255,255,0.3)", width: i === step ? 24 : 8 }} />
          ))}
        </div>

        {/* Button */}
        <button
          style={{ ...S.btn, background: last ? "#FF6240" : "#fff", color: last ? "#fff" : "#FF6240" }}
          onClick={() => last ? onDone() : setStep(step + 1)}
        >
          {last ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}

const S = {
  wrap: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", transition: "background 0.4s", maxWidth: 430, margin: "0 auto" },
  skip: { alignSelf: "flex-end", margin: "56px 24px 0 0", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  illus: { fontSize: 120, filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.3))", marginTop: 40 },
  bottom: { background: "rgba(0,0,0,0.25)", backdropFilter: "blur(20px)", borderRadius: "28px 28px 0 0", padding: "32px 28px 48px", width: "100%" },
  headline: { fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1.2, whiteSpace: "pre-line", marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 28, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  dots: { display: "flex", gap: 6, alignItems: "center", marginBottom: 28 },
  dot: { height: 8, borderRadius: 4, transition: "all 0.3s" },
  btn: { width: "100%", padding: "16px", borderRadius: 16, border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "opacity 0.2s" },
};
