// src/components/DisputeModal.jsx
// Bottom-sheet modal for raising a dispute on a delivered order.

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const REASONS = [
  { value: "not_received",  label: "🚫 Order not received" },
  { value: "wrong_order",   label: "❌ Wrong order delivered" },
  { value: "poor_quality",  label: "😞 Poor quality / damaged" },
  { value: "other",         label: "💬 Other" },
];

export default function DisputeModal({ order, user, onClose, onSubmitted }) {
  const [reason, setReason]           = useState("not_received");
  const [description, setDescription] = useState("");
  const [photo, setPhoto]             = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [err, setErr]                 = useState("");
  const fileRef                       = useRef();

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!description.trim()) { setErr("Please describe the problem"); return; }
    setSubmitting(true); setErr("");

    let evidenceUrl = null;
    if (photo) {
      setUploading(true);
      const ext  = photo.name.split(".").pop() || "jpg";
      const path = `disputes/${order.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("delivery-photos")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (upErr) {
        setErr("Photo upload failed: " + upErr.message);
        setSubmitting(false); setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("delivery-photos").getPublicUrl(path);
      evidenceUrl = urlData.publicUrl;
      setUploading(false);
    }

    const restaurantId = order.restaurant_id ?? order.restaurants?.id;
    const { error } = await supabase.from("disputes").insert({
      order_id:      order.id,
      customer_id:   user.id,
      restaurant_id: restaurantId,
      reason,
      description:   description.trim(),
      evidence_url:  evidenceUrl,
    });

    if (error) { setErr(error.message || "Failed to submit dispute"); setSubmitting(false); return; }

    await supabase.from("orders").update({
      disputed:          true,
      dispute_reason:    reason,
      dispute_raised_at: new Date().toISOString(),
    }).eq("id", order.id);

    setSubmitting(false);
    setDone(true);
    onSubmitted?.();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxHeight: "88vh", overflowY: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0 10px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Dispute submitted</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
              We'll review your case and resolve it within 24 hours. You'll be notified of the outcome.
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: "14px", background: CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Raise a Dispute</div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: BG, border: "none", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Reason selection */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>What went wrong?</div>
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", marginBottom: 6, borderRadius: 12, border: `1.5px solid ${reason === r.value ? CORAL : "#EBEBEB"}`, background: reason === r.value ? "#FFF0ED" : BG, color: reason === r.value ? CORAL : DARK, fontSize: 13, fontWeight: reason === r.value ? 700 : 500, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Describe the problem *</div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 300))}
                placeholder="Tell us what happened in detail..."
                style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 13, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", minHeight: 88, boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 11, color: "#C0C0C0", textAlign: "right", marginTop: 2 }}>{description.length}/300</div>
            </div>

            {/* Photo evidence */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Photo evidence (optional)</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              {!photoPreview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ height: 80, background: BG, borderRadius: 12, border: "1.5px dashed #DDDDD8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 4 }}
                >
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span style={{ fontSize: 11, color: "#B0B0B0", fontWeight: 600 }}>Tap to add photo</span>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <img src={photoPreview} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12 }} />
                  <button
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12 }}
                  >✕</button>
                </div>
              )}
            </div>

            {err && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 10 }}>{err}</div>}

            <button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              style={{ width: "100%", padding: "14px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (submitting || uploading) ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {uploading ? "Uploading photo..." : submitting ? "Submitting..." : "Submit Dispute"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
