// src/screens/RegisterRestaurant.jsx
import { useState } from "react";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const CATEGORIES = ["Nigerian", "Grills", "Chinese", "Snacks", "Fast Food", "Bakery", "Drinks", "Other"];

const ICONS = ["🍲","🔥","🍜","🥐","🍔","🍕","🥘","🍖","🌮","🥗","🍱","🧆","🥩","🦐","🍣","🫕","☕","🧁","🍰","🥧","🫔","🌯"];

const PRESETS = [
  { label: "Warm Red",   bgFrom: "#7C2D12", bgTo: "#C2410C" },
  { label: "Deep Red",   bgFrom: "#7F1D1D", bgTo: "#DC2626" },
  { label: "Blue",       bgFrom: "#1E3A5F", bgTo: "#2563EB" },
  { label: "Amber",      bgFrom: "#78350F", bgTo: "#D97706" },
  { label: "Green",      bgFrom: "#14532D", bgTo: "#16A34A" },
  { label: "Purple",     bgFrom: "#4C1D95", bgTo: "#7C3AED" },
  { label: "Pink",       bgFrom: "#831843", bgTo: "#DB2777" },
  { label: "Teal",       bgFrom: "#134E4A", bgTo: "#0D9488" },
];

export default function RegisterRestaurant({ onClose, onSubmit, submitting, error }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState({
    name: "", category: "Nigerian", description: "",
    address: "", phone: "", state: "",
    icon: "🍲", bgFrom: "#7C2D12", bgTo: "#C2410C",
    tags: "",
  });
  const [fieldErr, setFieldErr] = useState("");

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function validateStep1() {
    if (!form.name.trim())        { setFieldErr("Restaurant name is required"); return false; }
    if (!form.address.trim())     { setFieldErr("Address is required"); return false; }
    if (!form.phone.trim())       { setFieldErr("Phone number is required"); return false; }
    if (!form.description.trim()) { setFieldErr("Please add a short description"); return false; }
    setFieldErr(""); return true;
  }

  async function submit() {
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const { error: err } = await onSubmit({
      name:        form.name.trim(),
      category:    form.category,
      description: form.description.trim(),
      address:     form.address.trim(),
      phone:       form.phone.trim(),
      state:       form.state.trim() || null,
      icon:        form.icon,
      bg_from:     form.bgFrom,
      bg_to:       form.bgTo,
      tags,
    });
    if (!err) setStep(3);
  }

  // ── Step 3: Success ──────────────────────────────────────────
  if (step === 3) {
    return (
      <Overlay onClose={onClose} title="">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 10 }}>Application Submitted!</div>
          <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
            We'll review your application and get back to you within 24 hours. You'll be notified once your restaurant is live on Chowli.
          </div>
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14, padding: "14px 18px", fontSize: 13, color: "#92400E", lineHeight: 1.7, marginBottom: 28, textAlign: "left", width: "100%" }}>
            <strong>What happens next?</strong><br />
            1. Our admin reviews your details<br />
            2. You'll be approved or asked for more info<br />
            3. Once approved, your restaurant appears on Chowli
          </div>
          <button onClick={onClose} style={btnFull}>Done</button>
        </div>
      </Overlay>
    );
  }

  // ── Step 2: Preview + Submit ─────────────────────────────────
  if (step === 2) {
    return (
      <Overlay onClose={() => setStep(1)} title="Preview" backLabel="← Back to Edit">
        <div style={{ padding: "0 20px 40px" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>This is how your restaurant will appear on Chowli:</div>

          {/* Preview card */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ height: 130, background: `linear-gradient(135deg, ${form.bgFrom}, ${form.bgTo})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
              {form.icon}
            </div>
            <div style={{ padding: "16px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 4 }}>{form.name || "Restaurant name"}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{form.category} · {form.address}</div>
              <div style={{ fontSize: 12, color: "#B0B0B0", lineHeight: 1.5 }}>{form.description}</div>
            </div>
          </div>

          {error && <div style={{ background: "#FFF0ED", color: CORAL, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 12, marginBottom: 16 }}>{error}</div>}

          <button onClick={submit} disabled={submitting} style={{ ...btnFull, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </Overlay>
    );
  }

  // ── Step 1: Details form ─────────────────────────────────────
  return (
    <Overlay onClose={onClose} title="Register Your Restaurant">
      <div style={{ padding: "0 20px 40px" }}>

        <Field label="Restaurant name *" value={form.name} onChange={v => set("name", v)} placeholder="e.g. Mama Ngozi's Kitchen" />
        <Field label="Address *" value={form.address} onChange={v => set("address", v)} placeholder="Block 3, Shop 7, Tambuwal" />
        <Field label="State" value={form.state} onChange={v => set("state", v)} placeholder="e.g. Lagos State" />
        <Field label="Phone number *" value={form.phone} onChange={v => set("phone", v)} placeholder="080XXXXXXXX" type="tel" />

        {/* Category */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Category *</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => set("category", c)}
                style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: form.category === c ? CORAL : "#EBEBEB", background: form.category === c ? "#FFF0ED" : "#fff", color: form.category === c ? CORAL : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Description * <span style={{ color: "#C0C0C0", fontWeight: 400 }}>({form.description.length}/120)</span></div>
          <textarea value={form.description} onChange={e => set("description", e.target.value.slice(0, 120))} placeholder="Tell customers what makes your restaurant special..."
            style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 14, background: BG, outline: "none", fontSize: 14, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "12px 14px", lineHeight: 1.6, minHeight: 80, resize: "none" }} />
        </div>

        {/* Tags */}
        <Field label="Tags (comma separated)" value={form.tags} onChange={v => set("tags", v)} placeholder="Jollof Rice, Egusi, Pepper Soup" />

        {/* Icon picker */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Restaurant icon</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ICONS.map(ico => (
              <button key={ico} onClick={() => set("icon", ico)}
                style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${form.icon === ico ? CORAL : "#EBEBEB"}`, background: form.icon === ico ? "#FFF0ED" : "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ico}
              </button>
            ))}
          </div>
        </div>

        {/* Colour preset */}
        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>Colour theme</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { set("bgFrom", p.bgFrom); set("bgTo", p.bgTo); }}
                style={{ width: 44, height: 44, borderRadius: 12, border: `3px solid ${form.bgFrom === p.bgFrom ? "#fff" : "transparent"}`, outline: form.bgFrom === p.bgFrom ? `2px solid ${CORAL}` : "none", background: `linear-gradient(135deg, ${p.bgFrom}, ${p.bgTo})`, cursor: "pointer" }} />
            ))}
          </div>
        </div>

        {fieldErr && <div style={{ background: "#FFF0ED", color: CORAL, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 12, marginBottom: 16 }}>{fieldErr}</div>}

        <button onClick={() => { if (validateStep1()) setStep(2); }} style={btnFull}>
          Preview & Continue →
        </button>
      </div>
    </Overlay>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Overlay({ children, onClose, title, backLabel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 260, maxWidth: 430, margin: "0 auto", overflowY: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: BG, border: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>←</button>
        {title && <div style={{ fontSize: 16, fontWeight: 800, color: "#1C1C1E" }}>{backLabel || title}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={labelStyle}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: "#1C1C1E", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "12px 14px" }} />
    </div>
  );
}

const labelStyle  = { fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 };
const btnFull     = { width: "100%", padding: 14, background: CORAL, color: "#fff", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" };
