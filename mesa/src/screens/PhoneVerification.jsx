// src/screens/PhoneVerification.jsx
// Full-screen gate shown after email verification when profile.phone_verified is false.
// Nigerian phone input → SMS OTP via /auth/send-otp + /auth/verify-otp on Railway backend.
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const CORAL        = "#FF6240";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ── Helpers ──────────────────────────────────────────────────

function normalizeNigerianPhone(raw) {
  // Strip spaces, dashes, parentheses
  const digits = raw.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+234")) return digits;
  if (digits.startsWith("234"))  return "+" + digits;
  if (digits.startsWith("0"))    return "+234" + digits.slice(1);
  return "+234" + digits;
}

function isValidNigerianPhone(raw) {
  const normalized = normalizeNigerianPhone(raw);
  // +234 followed by 7-digit prefix group and 7 more digits = 13 digits total after +
  return /^\+234[789][01]\d{8}$/.test(normalized);
}

// ── 6-box OTP input ──────────────────────────────────────────

function OtpInput({ value, onChange, disabled }) {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  function handleKey(i, e) {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = value.split("");
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
      }
    }
  }

  function handleChange(i, e) {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    if (!ch) return;
    const next = value.padEnd(6, "").split("");
    next[i] = ch;
    onChange(next.join("").slice(0, 6));
    if (i < 5) refs[i + 1].current?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length) {
      onChange(pasted.padEnd(6, "").slice(0, 6));
      refs[Math.min(pasted.length, 5)].current?.focus();
    }
    e.preventDefault();
  }

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "24px 0" }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44,
            height: 52,
            border: value[i] ? `2px solid ${CORAL}` : "1.5px solid #E0E0E0",
            borderRadius: 12,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 800,
            color: "#1C1C1E",
            background: disabled ? "#F9F9F9" : "#fff",
            outline: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: "border-color 0.15s",
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export default function PhoneVerification({ user, onVerified }) {
  const [step, setStep]         = useState("phone"); // "phone" | "otp"
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [sending, setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]       = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [lockedUntil, setLockedUntil]   = useState(null); // Date

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Lock countdown
  const [lockSecsLeft, setLockSecsLeft] = useState(0);
  useEffect(() => {
    if (!lockedUntil) return;
    function tick() {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (secs <= 0) { setLockedUntil(null); setLockSecsLeft(0); setAttemptsLeft(3); }
      else setLockSecsLeft(secs);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const normalizedPhone = isValidNigerianPhone(phone) ? normalizeNigerianPhone(phone) : null;
  const isLocked = lockedUntil && Date.now() < lockedUntil;

  async function handleSendOtp() {
    if (!normalizedPhone || sending) return;
    setSending(true);
    setError(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body.error || "Failed to send code");
      setStep("otp");
      setCountdown(60);
      setAttemptsLeft(3);
      setLockedUntil(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || sending) return;
    setOtp("");
    setError(null);
    await handleSendOtp();
  }

  async function handleVerify() {
    if (otp.length !== 6 || verifying || isLocked) return;
    setVerifying(true);
    setError(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code: otp, userId: user.id }),
      });
      const body = await resp.json();
      if (!resp.ok) {
        if (body.attemptsLeft !== undefined) setAttemptsLeft(body.attemptsLeft);
        if (body.lockedUntil) setLockedUntil(new Date(body.lockedUntil));
        throw new Error(body.error || "Incorrect code");
      }
      // Backend has already updated profile.phone_verified = true
      onVerified();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === "otp" && !isLocked) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const lockMins = lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 60000) : 0;

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
        📱
      </div>

      {step === "phone" ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1C1C1E", marginBottom: 8, textAlign: "center" }}>
            Verify your phone
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, textAlign: "center", marginBottom: 28 }}>
            We need your Nigerian phone number to confirm your identity and protect your account.
          </div>

          <div style={{ width: "100%", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1C1C1E", marginBottom: 6 }}>
              Phone number
            </div>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 12px", fontSize: 14, fontWeight: 700, color: "#888", borderRight: "1px solid #EBEBEB", whiteSpace: "nowrap" }}>
                🇳🇬 +234
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="080 0000 0000"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && normalizedPhone && handleSendOtp()}
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#1C1C1E",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: "transparent",
                }}
              />
            </div>
            {phone.length > 3 && !normalizedPhone && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#DC2626" }}>
                Enter a valid Nigerian number (e.g. 0801 234 5678)
              </div>
            )}
          </div>

          <button
            onClick={handleSendOtp}
            disabled={!normalizedPhone || sending}
            style={{
              width: "100%",
              padding: "16px",
              background: (!normalizedPhone || sending) ? "#ccc" : CORAL,
              color: "#fff",
              border: "none",
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 800,
              cursor: (!normalizedPhone || sending) ? "default" : "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {sending ? "Sending code..." : "Send verification code"}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1C1C1E", marginBottom: 8, textAlign: "center" }}>
            Enter the code
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, textAlign: "center", marginBottom: 4 }}>
            We sent a 6-digit code to
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: CORAL, marginBottom: 4, textAlign: "center" }}>
            {normalizedPhone}
          </div>
          <button
            onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
            style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Change number
          </button>

          {isLocked ? (
            <div style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", textAlign: "center", width: "100%", margin: "16px 0" }}>
              Too many attempts. Please wait {lockMins > 1 ? `${lockMins} minutes` : `${lockSecsLeft} seconds`} before trying again.
            </div>
          ) : (
            <>
              <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

              {attemptsLeft < 3 && (
                <div style={{ fontSize: 12, color: "#D97706", marginBottom: 8 }}>
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.length !== 6 || verifying}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: (otp.length !== 6 || verifying) ? "#ccc" : CORAL,
                  color: "#fff",
                  border: "none",
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: (otp.length !== 6 || verifying) ? "default" : "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginBottom: 12,
                }}
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>
            </>
          )}

          <button
            onClick={handleResend}
            disabled={countdown > 0 || sending}
            style={{
              width: "100%",
              padding: "14px",
              background: "#fff",
              color: countdown > 0 ? "#B0B0B0" : "#1C1C1E",
              border: "1.5px solid #EBEBEB",
              borderRadius: 16,
              fontSize: 13,
              fontWeight: 700,
              cursor: (countdown > 0 || sending) ? "default" : "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {sending ? "Sending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </button>
        </>
      )}

      {error && (
        <div style={{ marginTop: 16, fontSize: 12, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "8px 14px", textAlign: "center", width: "100%" }}>
          {error}
        </div>
      )}

      {/* Sign out link */}
      <button
        onClick={() => supabase.auth.signOut()}
        style={{ marginTop: 32, background: "none", border: "none", color: "#B0B0B0", fontSize: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Sign out
      </button>
    </div>
  );
}
