// src/components/InstallAppCard.jsx
// PWA install prompt card — shown at the top of the Profile tab until the
// user installs the app or dismisses (iOS).
//
// Logic:
//   - Hidden if already running in standalone / fullscreen mode (app installed)
//   - Hidden on desktop (window.innerWidth > 640)
//   - Android: waits for `beforeinstallprompt`, shows "Install App" button
//   - iOS:     shows step-by-step share-sheet instructions + dismiss button
//   - Dismissal stored in localStorage under key `pwa_dismissed`

import { useState, useEffect } from "react";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true // Safari legacy
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isDesktop() {
  return window.innerWidth > 640;
}

const Step = ({ icon, text, num }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
    <div style={{
      width: 24, height: 24, borderRadius: "50%",
      background: CORAL, color: "#fff",
      fontSize: 11, fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {num}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: DARK, lineHeight: 1.5 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span>{text}</span>
    </div>
  </div>
);

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible]               = useState(false);
  const [platform, setPlatform]             = useState(null); // "android" | "ios" | null
  const [installing, setInstalling]         = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    // Never show if already installed or on desktop
    if (isStandalone() || isDesktop()) return;
    // Never show if user previously dismissed
    if (localStorage.getItem("pwa_dismissed") === "true") return;

    if (isIOS()) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    // Android / Chrome: wait for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Also detect if the app gets installed via appinstalled event
    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!visible || installed) return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_dismissed", "true");
    setVisible(false);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF8F6 0%, #ffffff 100%)",
      borderRadius: 20,
      border: "1px solid #FFD5CC",
      borderLeft: `4px solid ${CORAL}`,
      padding: "16px 16px 16px 18px",
      marginBottom: 14,
      position: "relative",
      boxShadow: "0 2px 12px rgba(255,98,64,0.08)",
      overflow: "hidden",
    }}>

      {/* Decorative blob */}
      <div style={{
        position: "absolute", top: -16, right: -16,
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,98,64,0.07)", pointerEvents: "none",
      }} />

      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>

        {/* App icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `linear-gradient(135deg, ${CORAL}, #FF8C6B)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, boxShadow: "0 2px 8px rgba(255,98,64,0.3)",
        }}>
          🍲
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 2 }}>
            Get the Chowli App
          </div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
            Install on your phone for faster ordering and notifications
          </div>
        </div>

        {/* Phone emoji top-right */}
        <div style={{ fontSize: 22, flexShrink: 0, marginTop: -4 }}>📲</div>
      </div>

      {/* ── Android: single install button ── */}
      {platform === "android" && (
        <button
          onClick={handleAndroidInstall}
          disabled={installing || !deferredPrompt}
          style={{
            width: "100%", padding: "12px", borderRadius: 14, border: "none",
            background: installing ? "#F5F5F5" : CORAL,
            color: installing ? "#B0B0B0" : "#fff",
            fontSize: 13, fontWeight: 800, cursor: installing ? "not-allowed" : "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: "opacity 0.2s",
          }}
        >
          {installing ? "Opening installer..." : "⬇ Install App"}
        </button>
      )}

      {/* ── iOS: step-by-step instructions ── */}
      {platform === "ios" && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 10 }}>
            How to install
          </div>
          <Step num="1" icon="⬆️" text="Tap the Share button in your browser" />
          <Step num="2" icon="➕" text='Tap "Add to Home Screen"' />
          <Step num="3" icon="✅" text='Tap "Add" to confirm' />
          <button
            onClick={handleDismiss}
            style={{
              width: "100%", padding: "11px", borderRadius: 14, border: `1.5px solid ${CORAL}`,
              background: "transparent", color: CORAL,
              fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 4,
            }}
          >
            Got it, I've installed it ✓
          </button>
        </div>
      )}
    </div>
  );
}
