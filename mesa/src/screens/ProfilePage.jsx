// src/screens/ProfilePage.jsx
import { useState } from "react";
import { useProfile }       from "../hooks/useProfile";
import { useRegistration }  from "../hooks/useRegistration";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const ROLE_BADGE = {
  customer: { label: "Customer",        bg: "#EFF6FF", color: "#2563EB" },
  owner:    { label: "Restaurant Owner", bg: "#F0FDF4", color: "#16A34A" },
  admin:    { label: "Admin",            bg: "#FFF0ED", color: CORAL    },
};

const RES_STATUS = {
  pending:   { label: "Pending",   color: "#D97706", bg: "#FFFBEB" },
  confirmed: { label: "Confirmed", color: "#16A34A", bg: "#F0FDF4" },
  rejected:  { label: "Declined",  color: "#DC2626", bg: "#FEF2F2" },
  completed: { label: "Done",      color: "#6B7280", bg: "#F3F4F6" },
};

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ProfilePage({ user, onClose, onSignOut, onRegister }) {
  const { profile, reservations, saving, error, updateProfile } = useProfile(user?.id);
  const { application, loaded: appLoaded } = useRegistration(user?.id);

  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [saved, setSaved]       = useState(false);

  function startEdit() {
    setName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setEditing(true);
    setSaved(false);
  }

  async function saveEdit() {
    const { error: err } = await updateProfile({ fullName: name, phone });
    if (!err) { setSaved(true); setEditing(false); }
  }

  const role = profile?.role || "customer";
  const rb   = ROLE_BADGE[role] || ROLE_BADGE.customer;

  const upcoming = reservations.filter(r => new Date(r.reserved_at) >= new Date() && r.status !== "rejected");
  const past     = reservations.filter(r => new Date(r.reserved_at) <  new Date() || r.status === "rejected");

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 250, maxWidth: 430, margin: "0 auto", overflowY: "auto", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", padding: "52px 20px 20px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: BG, border: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: DARK }}>My Profile</div>
      </div>

      <div style={{ padding: "24px 20px", flex: 1 }}>

        {/* Avatar + info */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 20, marginBottom: 14, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${CORAL}, #FF8C6B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {profile?.full_name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: DARK, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.full_name || "—"}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: rb.bg, color: rb.color }}>{rb.label}</span>
          </div>
          <button onClick={startEdit} style={{ fontSize: 12, fontWeight: 700, color: CORAL, background: "#FFF0ED", border: "none", borderRadius: 10, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>Edit</button>
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 14 }}>Edit Profile</div>
            {[
              { label: "Full name", value: name, set: setName, type: "text", placeholder: "Your full name" },
              { label: "Phone number", value: phone, set: setPhone, type: "tel", placeholder: "080XXXXXXXX" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>{f.label}</div>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "11px 14px" }} />
              </div>
            ))}
            {error && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, padding: "12px", background: CORAL, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: "12px 16px", background: BG, color: "#888", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
            {saved && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 8, textAlign: "center" }}>✓ Profile updated</div>}
          </div>
        )}

        {/* Restaurant registration CTA — only for customers */}
        {role === "customer" && appLoaded && (
          !application ? (
            <div style={{ background: `linear-gradient(135deg, ${CORAL}, #FF8C6B)`, borderRadius: 20, padding: 20, marginBottom: 14, cursor: "pointer" }} onClick={onRegister}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🏪</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Own a restaurant?</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>Register your restaurant on MESA and reach more customers. Tap to apply.</div>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 4 }}>Restaurant Application</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>{application.name}</div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                background: application.status === "pending" ? "#FFFBEB" : application.status === "approved" ? "#F0FDF4" : "#FEF2F2",
                color:      application.status === "pending" ? "#D97706" : application.status === "approved" ? "#16A34A"  : "#DC2626",
              }}>
                {application.status === "pending" ? "⏳ Under review" : application.status === "approved" ? "✓ Approved" : "✕ Declined"}
              </span>
              {application.admin_note && <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{application.admin_note}</div>}
            </div>
          )
        )}

        {/* Upcoming reservations */}
        {upcoming.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Upcoming Reservations</div>
            {upcoming.map(res => {
              const sc = RES_STATUS[res.status] || RES_STATUS.pending;
              return (
                <div key={res.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{res.restaurants?.icon} {res.restaurants?.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>📅 {formatDateTime(res.reserved_at)}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>👥 {res.party_size} {res.party_size === 1 ? "person" : "people"}</div>
                  {res.pre_order_note && <div style={{ fontSize: 11, color: "#888", marginTop: 6, background: BG, borderRadius: 8, padding: "5px 10px" }}>"{res.pre_order_note}"</div>}
                </div>
              );
            })}
          </>
        )}

        {/* Past reservations */}
        {past.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, marginTop: upcoming.length ? 8 : 0 }}>Past Reservations</div>
            {past.map(res => (
              <div key={res.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 16px", marginBottom: 10, opacity: 0.7 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>{res.restaurants?.icon} {res.restaurants?.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>📅 {formatDateTime(res.reserved_at)}</div>
              </div>
            ))}
          </>
        )}

        {reservations.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "20px 16px", textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📅</div>
            <div style={{ fontSize: 13, color: "#B0B0B0" }}>No reservations yet</div>
          </div>
        )}

        {/* Sign out */}
        <button onClick={onSignOut}
          style={{ width: "100%", padding: 14, background: "#fff", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 8 }}>
          Sign Out
        </button>

      </div>
    </div>
  );
}
