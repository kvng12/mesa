// src/components/DeliveryPhotoUpload.jsx
// Required step for restaurant owner before marking an order as delivered.
// Uploads to Supabase 'delivery-photos' bucket and saves URL to orders table.

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const BG = "#F5F5F5";

export default function DeliveryPhotoUpload({ orderId, restaurantId, onUploaded }) {
  const [photo, setPhoto]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState(false);
  const [err, setErr]         = useState("");
  const fileRef               = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setErr("Photo must be 10 MB or less"); return; }
    setErr("");
    setPhoto(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!photo) return;
    setUploading(true); setErr("");
    const ext  = photo.name.split(".").pop() || "jpg";
    const path = `${restaurantId}/delivery-${orderId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("delivery-photos")
      .upload(path, photo, { upsert: true, contentType: photo.type });
    if (upErr) { setErr(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("delivery-photos").getPublicUrl(path);
    const url = urlData.publicUrl;
    await supabase.from("orders").update({ delivery_photo_url: url }).eq("id", orderId);
    setUploading(false);
    setUploaded(true);
    onUploaded?.(url);
  };

  if (uploaded) {
    return (
      <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "7px 10px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <span>✓</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A" }}>Delivery photo uploaded</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#D97706", marginBottom: 6 }}>
        📸 Upload delivery photo to enable "Mark Delivered"
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {!preview ? (
        <div
          onClick={() => fileRef.current?.click()}
          style={{ height: 64, background: BG, borderRadius: 10, border: "1.5px dashed #DDDDD8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
        >
          <span style={{ fontSize: 18 }}>📷</span>
          <span style={{ fontSize: 11, color: "#B0B0B0", fontWeight: 600 }}>Tap to take / upload photo</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={preview} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {err && <div style={{ fontSize: 11, color: "#DC2626", marginBottom: 4 }}>{err}</div>}
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{ width: "100%", padding: "8px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {uploading ? "Uploading..." : "Upload & Unlock Delivery"}
            </button>
          </div>
          <button
            onClick={() => { setPhoto(null); setPreview(null); }}
            style={{ width: 26, height: 26, borderRadius: "50%", background: "#FEF2F2", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 12, flexShrink: 0 }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
