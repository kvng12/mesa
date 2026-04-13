// src/screens/Auth.jsx

import { useState } from "react";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";

function Field({ label, type = "text", value, onChange, placeholder, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={S.label}>{label}</div>}
      <div style={{ ...S.fieldWrap, borderColor: focused ? CORAL : "#EBEBEB" }}>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={S.input} />
        {right}
      </div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={S.backBtn}>
      <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
        <path d="M9 1L2 8.5L9 16" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
      <span style={{ fontSize: 12, color: "#B0B0B0", fontWeight: 600 }}>or continue with</span>
      <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════
export function LoginScreen({ onSignUp, onForgot, onBack, signIn }) {
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setLoad(true);
    const { error } = await signIn({ email, password: pw });
    setLoad(false);
    // onBack() closes the auth modal — useAuth listener picks up the session automatically
    if (error) setErr(error.message);
    else onBack();
  }

  return (
    <div style={S.screen}>
      <div style={S.topBar}><BackBtn onClick={onBack} /></div>
      <div style={S.heroBlock}>
        <div style={S.logoCircle}>🍽️</div>
        <h1 style={S.pageTitle}>Welcome back</h1>
        <p style={S.pageSub}>Sign in to your Chowli account</p>
      </div>
      <form onSubmit={submit} style={{ padding: "0 24px" }}>
        <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"
          right={<button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn}>{showPw ? "🙈" : "👁️"}</button>} />
        <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
          <span style={S.link} onClick={onForgot}>Forgot password?</span>
        </div>
        {err && <div style={S.errBox}>{err}</div>}
        <button type="submit" disabled={loading} style={S.coralBtn}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <Divider />
        <SocialRow />
        <div style={S.switchRow}>
          Don't have an account?{" "}
          <span style={S.link} onClick={onSignUp}>Sign up</span>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SIGN UP
// ════════════════════════════════════════════════════════════
export function SignUpScreen({ onLogin, onBack, signUp }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [pw, setPw]             = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [err, setErr]           = useState("");
  const [loading, setLoad]      = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr("Please enter your full name"); return; }
    if (!email.trim()) { setErr("Please enter your email"); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters"); return; }

    setErr(""); setLoad(true);
    const { data, error } = await signUp({ email, password: pw, fullName: name });
    setLoad(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // If Supabase email confirm is ON  → session is null, redirect to login with a note
    // If Supabase email confirm is OFF → session exists, onBack() closes auth and user is in
    if (data?.session) {
      // Logged in immediately — close auth screen, app picks up session via useAuth listener
      onBack();
    } else {
      // Email confirmation required — go to login page with a helpful message
      onLogin("check-email");
    }
  }

  return (
    <div style={S.screen}>
      <div style={S.topBar}><BackBtn onClick={onBack} /></div>
      <div style={S.heroBlock}>
        <div style={S.logoCircle}>🍽️</div>
        <h1 style={S.pageTitle}>Create account</h1>
        <p style={S.pageSub}>Join Chowli — it's free</p>
      </div>

      {/* Phone / Email toggle */}
      <div style={{ display: "flex", gap: 8, padding: "0 24px", marginBottom: 20 }}>
        {["Email", "Phone"].map(t => (
          <button key={t} type="button" onClick={() => setUsePhone(t === "Phone")}
            style={{ flex: 1, padding: "10px", borderRadius: 12, border: `2px solid ${(usePhone ? t === "Phone" : t === "Email") ? CORAL : "#EBEBEB"}`, background: (usePhone ? t === "Phone" : t === "Email") ? "#FFF0ED" : "#fff", color: (usePhone ? t === "Phone" : t === "Email") ? CORAL : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ padding: "0 24px" }}>
        <Field label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
        {usePhone
          ? <Field label="Phone number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080XXXXXXXX" />
          : <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        }
        <Field label="Password" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 6 characters"
          right={<button type="button" onClick={() => setShowPw(v => !v)} style={S.eyeBtn}>{showPw ? "🙈" : "👁️"}</button>} />

        {err && <div style={S.errBox}>{err}</div>}

        <button type="submit" disabled={loading} style={S.coralBtn}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
        <Divider />
        <SocialRow />
        <div style={S.switchRow}>
          Already have an account?{" "}
          <span style={S.link} onClick={() => onLogin()}>Sign in</span>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ════════════════════════════════════════════════════════════
export function ForgotScreen({ onBack, signInWithMagicLink }) {
  const [email, setEmail]  = useState("");
  const [sent, setSent]    = useState(false);
  const [loading, setLoad] = useState(false);
  const [err, setErr]      = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr(""); setLoad(true);
    const { error } = await signInWithMagicLink(email);
    setLoad(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div style={S.screen}>
      <div style={S.topBar}><BackBtn onClick={onBack} /></div>
      <div style={S.heroBlock}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
        <h1 style={S.pageTitle}>Reset password</h1>
        <p style={S.pageSub}>We'll send a magic link to your email</p>
      </div>
      {sent ? (
        <div style={{ padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Check your inbox for a login link. It'll sign you straight in.
          </p>
          <button style={{ ...S.coralBtn, marginTop: 24 }} onClick={onBack}>Back to Sign In</button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ padding: "0 24px" }}>
          <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          {err && <div style={S.errBox}>{err}</div>}
          <button type="submit" disabled={loading} style={S.coralBtn}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </div>
  );
}

function SocialRow() {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
      {[{ label: "Google", emoji: "G" }, { label: "Facebook", emoji: "f" }].map(p => (
        <button key={p.label} type="button" style={S.socialBtn}>
          <span style={{ fontWeight: 900, fontSize: 15, color: p.label === "Google" ? "#EA4335" : "#1877F2" }}>{p.emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

const S = {
  screen:    { minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 32, overflowY: "auto" },
  topBar:    { padding: "52px 24px 0" },
  backBtn:   { width: 40, height: 40, borderRadius: 12, background: "#F5F5F5", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  heroBlock: { padding: "24px 24px 28px", textAlign: "center" },
  logoCircle:{ width: 64, height: 64, borderRadius: 20, background: "#FFF0ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" },
  pageTitle: { fontSize: 26, fontWeight: 800, color: DARK, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  pageSub:   { fontSize: 13, color: "#888", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  label:     { fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 },
  fieldWrap: { display: "flex", alignItems: "center", border: "1.5px solid #EBEBEB", borderRadius: 14, background: "#F9F9F9", padding: "0 16px", height: 52, transition: "border-color 0.2s" },
  input:     { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 },
  eyeBtn:    { background: "transparent", border: "none", cursor: "pointer", fontSize: 16, padding: "0 0 0 8px" },
  errBox:    { background: "#FFF0ED", color: CORAL, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 12, marginBottom: 16 },
  coralBtn:  { width: "100%", padding: "16px", background: CORAL, color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 },
  link:      { color: CORAL, fontWeight: 700, cursor: "pointer" },
  switchRow: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 16 },
  socialBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", border: "1.5px solid #EBEBEB", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" },
};
