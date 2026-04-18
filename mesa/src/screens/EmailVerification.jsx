// src/screens/EmailVerification.jsx
// Full-screen gate shown when user.email_confirmed_at is null.
// User can resend the confirmation email or manually refresh after clicking the link.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const CORAL = "#FF6240";

export default function EmailVerification({ user, onVerified }) {
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [checking, setChecking]   = useState(false);
  const [error, setError]         = useState(null);
  const [countdown, setCountdown] = useState(0); // seconds until resend allowed

  // Poll every 5 s — refreshSession fetches the latest token from Supabase,
  // which will contain email_confirmed_at once the user clicks the link.
  // This covers the case where they verify in another tab without pressing the button.
  useEffect(() => {
    const id = setInterval(async () => {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.user?.email_confirmed_at) {
        clearInterval(id);
        onVerified(session.user);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [onVerified]);

  // Countdown timer for resend throttle
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  async function handleResend() {
    if (countdown > 0 || sending) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });
    setSending(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
      setCountdown(60);
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    setError(null);
    // Force a session refresh so we get the latest email_confirmed_at value
    const { data: { session }, error: err } = await supabase.auth.refreshSession();
    setChecking(false);
    if (err) {
      setError("Could not refresh session. Please try again.");
      return;
    }
    if (session?.user?.email_confirmed_at) {
      onVerified(session.user);
    } else {
      setError("Email not confirmed yet. Check your inbox and click the link.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F5F5",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      maxWidth: 430,
      margin: "0 auto",
    }}>
      {/* Icon */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        background: "#FFF0ED",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 36,
        marginBottom: 24,
        boxShadow: "0 4px 20px rgba(255,98,64,0.15)",
      }}>
        ✉️
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: "#1C1C1E", marginBottom: 8, textAlign: "center" }}>
        Confirm your email
      </div>
      <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6, textAlign: "center", marginBottom: 8 }}>
        We sent a confirmation link to
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: CORAL, marginBottom: 28, textAlign: "center", wordBreak: "break-all" }}>
        {user.email}
      </div>
      <div style={{ fontSize: 13, color: "#B0B0B0", lineHeight: 1.6, textAlign: "center", marginBottom: 32 }}>
        Open the email and tap the link to verify your account. Then come back here.
      </div>

      {/* Primary action: I've verified */}
      <button
        onClick={handleCheckNow}
        disabled={checking}
        style={{
          width: "100%",
          padding: "16px",
          background: checking ? "#ccc" : CORAL,
          color: "#fff",
          border: "none",
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 800,
          cursor: checking ? "default" : "pointer",
          marginBottom: 12,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          transition: "background 0.2s",
        }}
      >
        {checking ? "Checking..." : "I've verified, continue →"}
      </button>

      {/* Secondary: Resend */}
      <button
        onClick={handleResend}
        disabled={sending || countdown > 0}
        style={{
          width: "100%",
          padding: "14px",
          background: "#fff",
          color: countdown > 0 ? "#B0B0B0" : "#1C1C1E",
          border: "1.5px solid #EBEBEB",
          borderRadius: 16,
          fontSize: 13,
          fontWeight: 700,
          cursor: (sending || countdown > 0) ? "default" : "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {sending
          ? "Sending..."
          : countdown > 0
            ? `Resend in ${countdown}s`
            : "Resend confirmation email"}
      </button>

      {/* Success / error feedback */}
      {sent && !error && (
        <div style={{ marginTop: 16, fontSize: 12, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
          Email sent! Check your inbox (and spam folder).
        </div>
      )}
      {error && (
        <div style={{ marginTop: 16, fontSize: 12, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Sign out link */}
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 32, background: "none", border: "none", color: "#B0B0B0", fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Sign out and use a different email
      </button>
    </div>
  );
}
