// src/App.jsx — Chowli Food Marketplace

import { useState, useEffect, useRef } from "react";
import { useAuth }                            from "./hooks/useAuth";
import { useRestaurants, useOwnerRestaurant } from "./hooks/useRestaurants";
import { useFeed }                            from "./hooks/useFeed";
import { useStories, useStoryUpload }         from "./hooks/useStories";
import { useCart }                            from "./hooks/useCart";
import { useReservations, useIncomingReservations } from "./hooks/useReservations";
import { useIncomingOrders }                  from "./hooks/useCart";
import { useOrders }                          from "./hooks/useOrders";
import Onboarding                             from "./screens/Onboarding";
import { LoginScreen, SignUpScreen, ForgotScreen } from "./screens/Auth";
import StoryViewer                            from "./screens/StoryViewer";
import CartScreen, { ReservationScreen }      from "./screens/Cart";
import OrdersPage                             from "./screens/OrdersPage";
import ProfilePage                            from "./screens/ProfilePage";
import ReviewModal                            from "./screens/ReviewModal";
import RegisterRestaurant                     from "./screens/RegisterRestaurant";
import AdminPanel                             from "./screens/AdminPanel";
import FeedScreen                             from "./screens/FeedScreen";
import { useProfile }                         from "./hooks/useProfile";
import { usePromoCodes }                      from "./hooks/usePromoCodes";
import { supabase } from "./lib/supabase";
import { useReviews }                         from "./hooks/useReviews";
import { useRegistration }                    from "./hooks/useRegistration";
import { useChat, useOwnerChats, useUnreadCount } from "./hooks/useChat";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import { usePushNotifications } from "./hooks/usePushNotifications";
import DeliveryPhotoUpload from "./components/DeliveryPhotoUpload";
import BankDetailsForm from "./components/BankDetailsForm";
import EmailVerification from "./screens/EmailVerification";
// import PhoneVerification from "./screens/PhoneVerification"; // disabled — re-enable when cash/phone-OTP re-launches
import MenuItemSheet from "./components/MenuItemSheet";
import FavoritesScreen from "./screens/FavoritesScreen";
import { useFavorites } from "./hooks/useFavorites";

const PRIMARY      = "#8B1A1A";
const PRIMARY_DARK = "#6B1414";
const ACCENT       = "#F4C430";
const DARK         = "#1C1C1E";
const TEXT_MUTED   = "#666666";
const BG           = "#FFFFFF";
const BG_SOFT      = "#F7F5F2";
const BORDER       = "#ECE6DE";
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

const POST_TYPES = [
  { id: "new",      label: "New Item", color: PRIMARY,     bg: BG_SOFT, icon: "✨" },
  { id: "promo",    label: "Promo",    color: "#D97706", bg: "#FFFBEB", icon: "🎉" },
  { id: "update",   label: "Update",   color: "#2563EB", bg: "#EFF6FF", icon: "📢" },
  { id: "sold_out", label: "Sold Out", color: "#6B7280", bg: "#F3F4F6", icon: "😔" },
];

// CAT_ICONS is a lookup for known categories; getCatIcon falls back to 🍽️
const CAT_ICONS = { All: "🍽️", Nigerian: "🍲", Grills: "🔥", Chinese: "🍜", Snacks: "🥐", "Fast Food": "🍔", Burgers: "🍔", Pizza: "🍕", Seafood: "🦐", Salads: "🥗", Desserts: "🍰", Drinks: "🥤", Breakfast: "🍳", Soup: "🍜", Rice: "🍚", Chicken: "🍗" };
const getCatIcon = (cat) => CAT_ICONS[cat] || "🍽️";
const getPostType = id => POST_TYPES.find(t => t.id === id) || POST_TYPES[2];

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function fmt12(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12    = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2,"0")}${suffix}`;
}

function getHoursInfo(restaurant) {
  const hours = restaurant.opening_hours;
  if (!hours) return null;
  const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const today     = DAY_NAMES[new Date().getDay()];
  const todayH    = hours[today];
  if (!todayH?.enabled) return "Closed today";
  const [openHr,  openMn]  = (todayH.open  || "00:00").split(":").map(Number);
  const [closeHr, closeMn] = (todayH.close || "23:59").split(":").map(Number);
  const nowMin   = new Date().getHours() * 60 + new Date().getMinutes();
  const openMin  = openHr  * 60 + openMn;
  const closeMin = closeHr * 60 + closeMn;
  if (nowMin < openMin)  return `Opens at ${fmt12(todayH.open)}`;
  if (nowMin > closeMin) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = DAY_NAMES[(new Date().getDay() + i) % 7];
      const nextH   = hours[nextDay];
      if (nextH?.enabled) {
        const label = i === 1 ? "tomorrow" : nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
        return `Opens ${label} ${fmt12(nextH.open)}`;
      }
    }
    return "Closed";
  }
  return `Closes at ${fmt12(todayH.close)}`;
}
function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening";
}

// ── Status helpers ───────────────────────────────────────────
const ORDER_STATUS = { pending: { label: "Received", color: "#D97706", bg: "#FFFBEB" }, confirmed: { label: "Confirmed", color: "#2563EB", bg: "#EFF6FF" }, preparing: { label: "Preparing", color: PRIMARY, bg: BG_SOFT }, ready: { label: "Ready!", color: "#16A34A", bg: "#F0FDF4" }, completed: { label: "Completed", color: "#6B7280", bg: "#F3F4F6" }, delivered: { label: "Delivered", color: "#16A34A", bg: "#F0FDF4" }, cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" } };
const RES_STATUS  = { pending: { label: "Pending", color: "#D97706", bg: "#FFFBEB" }, confirmed: { label: "Confirmed", color: "#16A34A", bg: "#F0FDF4" }, rejected: { label: "Declined", color: "#DC2626", bg: "#FEF2F2" }, completed: { label: "Done", color: "#6B7280", bg: "#F3F4F6" } };

// ════════════════════════════════════════════════════════════
//  UI COMPONENTS
// ════════════════════════════════════════════════════════════

function StoryRing({ group, onClick }) {
  const r = group.restaurant;
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
      <div style={{ width: 66, height: 66, borderRadius: "50%", padding: 2.5, background: group.hasUnviewed ? `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})` : "rgba(0,0,0,0.08)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `linear-gradient(135deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2.5px solid #fff" }}>{r.icon}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: DARK, maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name.split(" ")[0]}</div>
    </div>
  );
}

function StoryUploadCard({ restaurantId, restaurant }) {
  const { uploading, error, uploadStory } = useStoryUpload(restaurantId);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile]       = useState(null);
  const [done, setDone]       = useState(false);
  const fileRef               = useRef();

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setDone(false);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (!file) return;
    const { error: err } = await uploadStory({ file, caption });
    if (!err) { setFile(null); setPreview(null); setCaption(""); setDone(true); setTimeout(() => setDone(false), 3000); }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "16px 16px 4px", fontSize: 13, fontWeight: 800, color: DARK }}>Post a Story</div>
      <div style={{ padding: "4px 16px 14px", fontSize: 11, color: "#888" }}>Visible to customers for 24 hours</div>
      <div style={{ padding: "0 16px 16px" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview
          ? <div onClick={() => fileRef.current?.click()} style={{ height: 140, background: BG, borderRadius: 14, border: "1.5px dashed #EBEBEB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 13, color: "#B0B0B0", fontWeight: 600 }}>Tap to add a photo</span>
            </div>
          : <div style={{ position: "relative" }}>
              <img src={preview} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 14 }} />
              <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
            </div>
        }
        {preview && <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 120))} placeholder="Caption (optional)..." style={{ width: "100%", marginTop: 10, border: "none", background: BG, outline: "none", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", minHeight: 54 }} />}
        {error && <div style={{ fontSize: 12, color: PRIMARY, fontWeight: 600, marginTop: 8 }}>{error}</div>}
        {done  && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 8 }}>✓ Story live for 24 hours.</div>}
        {preview && <button disabled={uploading} onClick={submit} style={{ width: "100%", marginTop: 12, padding: "13px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Post Story"}</button>}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: "relative", width: 52, height: 30, display: "inline-block", flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: 30, background: checked ? PRIMARY : "#E0E0E0", transition: "0.3s", cursor: "pointer" }}>
        <span style={{ position: "absolute", left: checked ? 25 : 3, top: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
      </span>
    </label>
  );
}

function VCard({ r, onClick }) {
  const all = (r.menu_categories || []).flatMap(c => c.menu_items || []);
  return (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: 20, padding: 14, display: "flex", gap: 14, cursor: "pointer", border: "1px solid #F0EDE8", opacity: r.is_open ? 1 : 0.55 }}>
      <div style={{ width: 80, height: 80, borderRadius: 16, background: `linear-gradient(135deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0, overflow: "hidden" }}>
        {r.logo_url
          ? <img src={r.logo_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : r.icon
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: DARK }}>{r.name}</span>
          {r.verified && <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", padding: "2px 7px", borderRadius: 10, flexShrink: 0 }}>✓</span>}
          {!r.verified && r.created_at && (Date.now() - new Date(r.created_at) < 30 * 24 * 3600000) && <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 7px", borderRadius: 10, flexShrink: 0 }}>New</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>{Array.isArray(r.category) ? r.category.join(", ") : r.category}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ color: r.is_open ? "#22C55E" : "#D4CEC8", fontSize: 8 }}>●</span><span style={{ fontSize: 11, fontWeight: 700, color: r.is_open ? "#22C55E" : "#B0B0B0" }}>{r.is_open ? "Open" : "Closed"}</span></span>
          {(() => { const info = getHoursInfo(r); return info ? <span style={{ fontSize: 10, color: "#B0B0B0", fontWeight: 500 }}>🕐 {info}</span> : null; })()}
          {r.state && <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 7px", borderRadius: 10 }}>📍 {r.state}</span>}
        </div>
        <div style={{ fontSize: 12, color: "#B0B0B0", marginBottom: 8, lineHeight: 1.4 }}>{r.description}</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(r.tags || []).slice(0, 3).map(t => <span key={t} style={{ fontSize: 9, fontWeight: 700, color: "#888", background: BG, padding: "3px 8px", borderRadius: 10 }}>{t}</span>)}
          {r.is_open && all.filter(i => i.is_available).length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: PRIMARY, background: BG_SOFT, padding: "3px 8px", borderRadius: 10 }}>{all.filter(i => i.is_available).length} available</span>}
        </div>
      </div>
    </div>
  );
}

function HCard({ r, onClick }) {
  return (
    <div onClick={onClick} style={{ flexShrink: 0, width: 190, background: "#fff", borderRadius: 20, overflow: "hidden", cursor: "pointer", border: "1px solid #F0EDE8" }}>
      <div style={{ width: "100%", height: 120, background: `linear-gradient(140deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, position: "relative" }}>
        {/* Banner image as card background if available */}
        {r.banner_url && <img src={r.banner_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        {r.badge && <div style={{ position: "absolute", top: 10, left: 10, background: PRIMARY, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, zIndex: 1 }}>{r.badge}</div>}
        {r.is_open && <div style={{ position: "absolute", top: 10, right: 10, width: 9, height: 9, borderRadius: "50%", background: "#22C55E", border: "2px solid #fff", zIndex: 1 }} />}
        {r.logo_url
          ? <img src={r.logo_url} alt={r.name} style={{ position: "relative", zIndex: 1, width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.4)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }} />
          : <span style={{ position: "relative", zIndex: 1 }}>{r.icon}</span>
        }
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
          {r.verified && <span style={{ fontSize: 9, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", padding: "2px 6px", borderRadius: 8, flexShrink: 0 }}>✓</span>}
        </div>
        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 4 }}>{Array.isArray(r.category) ? r.category[0] : r.category}</div>
        <div style={{ fontSize: 10, color: "#B0B0B0" }}>📍 {r.address}</div>
      </div>
    </div>
  );
}

function PostCard({ post, liked, onLike, onViewRest }) {
  const r = post.restaurants; const pt = getPostType(post.post_type); if (!r) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #F0EDE8" }}>
      <div style={{ height: 4, background: pt.color }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
            <div style={{ fontSize: 10, color: "#B0B0B0" }}>{timeAgo(post.created_at)}</div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: pt.bg, color: pt.color }}>{pt.icon} {pt.label}</div>
        </div>
        <div style={{ fontSize: 14, color: "#2D2D2D", lineHeight: 1.65, fontWeight: 500, marginBottom: 14 }}>{post.text}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #F7F5F2" }}>
          <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 6, background: liked ? BG_SOFT : "transparent", border: "none", borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span style={{ fontSize: 14 }}>{liked ? "❤️" : "🤍"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: liked ? PRIMARY : "#B0B0B0" }}>{post.like_count}</span>
          </button>
          <button onClick={onViewRest} style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>View Restaurant →</button>
        </div>
      </div>
    </div>
  );
}



// ── LogoFileInput — hidden file input for logo upload in the header ──
function LogoFileInput({ ownerR, uploadLogo }) {
  const fileRef = useRef();
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadLogo(file);
  }
  return (
    <input id="logo-file-input" ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
  );
}

// ── BannerFileInput — hidden file input for banner/cover upload ──
function BannerFileInput({ uploadBanner }) {
  const fileRef = useRef();
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBanner(file);
  }
  return (
    <input id="banner-file-input" ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
  );
}

// ── DashMenuItem — dashboard food item with image upload + big toggle ──
function DashMenuItem({ item, restaurantId, onToggle, onDelete, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl]   = useState(null);
  const fileRef                   = useRef();

  const imgSrc = localUrl || item.image_url;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Optimistic preview
    const reader = new FileReader();
    reader.onload = ev => setLocalUrl(ev.target.result);
    reader.readAsDataURL(file);
    await onImageUploaded(file);
    setUploading(false);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, marginBottom: 10, border: `2px solid ${item.is_available ? "#F0EDE8" : "#FECACA"}`, overflow: "hidden", transition: "border-color 0.25s" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>

        {/* Image column — tappable to upload */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ width: 80, flexShrink: 0, background: imgSrc ? "transparent" : "#F7F5F2", position: "relative", cursor: "pointer", minHeight: 80 }}
        >
          {imgSrc ? (
            <img src={imgSrc} alt={item.name}
              style={{ width: 80, height: "100%", minHeight: 80, objectFit: "cover", display: "block", opacity: item.is_available ? 1 : 0.5 }} />
          ) : (
            <div style={{ width: 80, height: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ fontSize: 8, color: "#C0C0C0", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>Add photo</span>
            </div>
          )}
          {uploading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 16 }}>⏳</div>
            </div>
          )}
          {/* Edit overlay on hover */}
          {imgSrc && (
            <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.5)", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✏️</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {/* Info column */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: item.is_available ? "#1C1C1E" : "#C0C0C0", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: item.is_available ? "#8B1A1A" : "#EDE9E4", marginBottom: 6 }}>₦{Number(item.price).toLocaleString()}</div>
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "none", borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Delete
            </button>
          )}
        </div>

        {/* Toggle column — big thumb-friendly switch */}
        <div
          onClick={onToggle}
          style={{
            width: 72, flexShrink: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 5, cursor: "pointer",
            background: item.is_available ? "#F0FDF4" : "#FEF2F2",
            borderLeft: `1px solid ${item.is_available ? "#BBF7D0" : "#FECACA"}`,
            transition: "background 0.25s",
            padding: "8px 0",
          }}
        >
          <div style={{
            width: 36, height: 20, borderRadius: 10,
            background: item.is_available ? "#16A34A" : "#E0E0E0",
            position: "relative", transition: "background 0.25s",
          }}>
            <div style={{
              position: "absolute",
              left: item.is_available ? 18 : 2,
              top: 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#fff",
              transition: "left 0.25s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, color: item.is_available ? "#16A34A" : "#DC2626", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            {item.is_available ? "On" : "Off"}
          </span>
        </div>

      </div>
    </div>
  );
}


// ── Default menu categories for new restaurants ──
const DEFAULT_MENU_CATS = [
  { label: "Main Dish", icon: "🍽️" },
  { label: "Rice & Swallow", icon: "🍚" },
  { label: "Soups & Stews", icon: "🍲" },
  { label: "Grills & Skewers", icon: "🔥" },
  { label: "Snacks & Sides", icon: "🥐" },
  { label: "Drinks", icon: "🥤" },
  { label: "Desserts", icon: "🍰" },
  { label: "Specials", icon: "✨" },
];

// ── Add Menu Item Modal ──
function AddMenuItemModal({ ownerR, onClose, onAdded }) {
  const [name, setName]             = useState("");
  const [price, setPrice]           = useState("");
  const [catMode, setCatMode]       = useState("existing");
  const [selCatId, setSelCatId]     = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [customCat, setCustomCat]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  // ISSUE 3 FIX: fetch categories fresh from DB rather than relying on
  // ownerR.menu_categories which may be stale or empty on first render.
  const [cats, setCats]             = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // ISSUE 2: photo upload state
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef();

  useEffect(() => {
    if (!ownerR?.id) return;
    supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", ownerR.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const fetched = data || [];
        setCats(fetched);
        if (fetched.length > 0) setSelCatId(fetched[0].id);
        setCatsLoading(false);
      });
  }, [ownerR?.id]);

  function handleImageFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setErr("Image must be 10 MB or less"); return; }
    setErr("");
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  const submit = async () => {
    if (!name.trim()) { setErr("Item name is required"); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { setErr("Enter a valid price"); return; }
    if (catMode === "existing" && !selCatId) {
      setCatMode("new");
      setErr("Create a category first, then add your item.");
      return;
    }
    setSaving(true); setErr("");

    try {
      // Resolve category — create new one if needed
      let categoryId = selCatId;
      if (catMode === "new") {
        const catName = customCat.trim() || newCatName.trim();
        if (!catName) { setErr("Category name is required"); setSaving(false); return; }
        console.log("[AddMenuItemModal] creating category:", { restaurant_id: ownerR.id, name: catName });
        const { data: newCat, error: catErr } = await supabase
          .from("menu_categories")
          .insert({ restaurant_id: ownerR.id, name: catName, sort_order: cats.length })
          .select().single();
        if (catErr) throw catErr;
        categoryId = newCat.id;
      }

      // Upload photo first (if selected), get public URL
      // Upload photo first (if selected), get public URL
      let imageUrl = null;
      if (imageFile) {
        setUploading(true);
        const ext      = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
        const fileName = `${ownerR.id}/item-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("food-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: imageFile.type,
            onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
          });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("food-images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Insert the menu item
      const insertPayload = {
        restaurant_id:    ownerR.id,
        category_id:      categoryId,
        name:             name.trim(),
        price:            Number(price),
        is_available:     true,
        sort_order:       0,
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };
      console.log("[AddMenuItemModal] ownerR:", { id: ownerR?.id, name: ownerR?.name, owner_id: ownerR?.owner_id });
      console.log("[AddMenuItemModal] inserting menu_item:", insertPayload);
      const { error: itemErr } = await supabase
        .from("menu_items")
        .insert(insertPayload);
      if (itemErr) throw itemErr;

      onAdded();
      onClose();
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setUploading(false);
    }
    setSaving(false);
  }

  const busy = saving || uploading;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Add Menu Item</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: BG, border: "none", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* ── Food photo upload ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>Food Photo (optional)</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Square image placeholder */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 100, height: 100, borderRadius: 16, flexShrink: 0, overflow: "hidden",
                border: imagePreview ? "2px solid #F0EDE8" : "2px dashed #DDDDD8",
                background: BG, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {imagePreview
                ? <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 2 }}>📷</div>
                    <div style={{ fontSize: 9, color: "#B0B0B0", fontWeight: 600 }}>Tap to add</div>
                  </div>
              }
            </div>
            <div style={{ flex: 1 }}>
              {imagePreview ? (
                <>
                  <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginBottom: 8 }}>✓ Photo selected</div>
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); setUploadProgress(0); }}
                    style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#B0B0B0", lineHeight: 1.65 }}>
                  Add a photo to make your item stand out.<br />
                  <span style={{ fontWeight: 600, color: "#888" }}>JPG, PNG · max 10 MB</span>
                </div>
              )}
              {uploading && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>Uploading…</span>
                    <span style={{ fontSize: 10, color: PRIMARY, fontWeight: 700 }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "#F0EDE8", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${uploadProgress}%`, background: PRIMARY, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Item name ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Item Name *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jollof Rice + Chicken"
            style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>

        {/* ── Price ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Price (₦) *</div>
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 1500" type="number" inputMode="numeric"
            style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>

        {/* ── Category ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>Category</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["existing", "new"].map(m => (
              <button key={m} onClick={() => setCatMode(m)}
                style={{ flex: 1, padding: "9px", borderRadius: 12, border: `1.5px solid ${catMode === m ? PRIMARY : "#EBEBEB"}`, background: catMode === m ? BG_SOFT : "#fff", color: catMode === m ? PRIMARY : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {m === "existing" ? "Existing category" : "+ New category"}
              </button>
            ))}
          </div>

          {catMode === "existing" ? (
            catsLoading
              ? <div style={{ fontSize: 13, color: "#B0B0B0", padding: "10px 0" }}>Loading categories…</div>
              : cats.length === 0
              ? <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>No categories yet</div>
                  <div style={{ fontSize: 12, color: "#78350F", marginBottom: 10 }}>Please create a category first before adding items.</div>
                  <button onClick={() => setCatMode("new")} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#D97706", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+ Create a category</button>
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cats.map(c => (
                    <button key={c.id} onClick={() => setSelCatId(c.id)}
                      style={{ textAlign: "left", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${selCatId === c.id ? PRIMARY : "#EBEBEB"}`, background: selCatId === c.id ? BG_SOFT : BG, color: selCatId === c.id ? PRIMARY : DARK, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {c.name}
                    </button>
                  ))}
                </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10, fontWeight: 600 }}>Pick a default or type your own:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {DEFAULT_MENU_CATS.map(dc => (
                  <button key={dc.label} onClick={() => { setCustomCat(""); setNewCatName(dc.label); }}
                    style={{ padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${newCatName === dc.label && !customCat ? PRIMARY : "#EBEBEB"}`, background: newCatName === dc.label && !customCat ? BG_SOFT : "#fff", color: newCatName === dc.label && !customCat ? PRIMARY : "#555", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {dc.icon} {dc.label}
                  </button>
                ))}
              </div>
              <input value={customCat} onChange={e => { setCustomCat(e.target.value); setNewCatName(""); }} placeholder="Or type a custom category name..."
                style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 13, color: DARK, padding: "11px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
            </div>
          )}
        </div>

        {err && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 12, padding: "8px 12px", background: "#FEF2F2", borderRadius: 10 }}>{err}</div>}

        {(() => {
          const noCat = catMode === "existing" && !catsLoading && cats.length === 0;
          const disabled = busy || noCat;
          return (
            <button onClick={submit} disabled={disabled}
              style={{ width: "100%", padding: 14, background: disabled ? "#B0B0B0" : PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {uploading ? `Uploading photo… ${uploadProgress}%` : saving ? "Adding…" : "Add to Menu"}
            </button>
          );
        })()}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
//  CHAT SCREEN — Customer ↔ Restaurant
// ════════════════════════════════════════════════════════════
function ChatScreen({ user, restaurant, conversationId, customerId, onClose }) {
  // customerId: when owner opens a customer's conversation, this is the customer's user ID.
  // It is used as userId for the conversation LOOKUP, while user.id stays as the actual sender.
  const lookupUserId = customerId || user?.id;

  const { messages, loading, sending, sendMessage } = useChat({
    userId:           lookupUserId,
    restaurantId:     restaurant?.id,
    conversationId:   conversationId || null,
    senderIdOverride: user?.id,       // always send as the actual logged-in user
  });
  const [text, setText] = useState("");
  const bottomRef       = useRef();
  const inputRef        = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    const msg = text;
    setText("");
    await sendMessage(msg);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 300, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${restaurant.bg_from || PRIMARY}, ${restaurant.bg_to || "#FF8C6B"})`, padding: "max(env(safe-area-inset-top), 52px) 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : restaurant.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{restaurant.is_open ? "Open now" : "Closed"}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, background: "#F7F5F2" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#B0B0B0", fontSize: 13 }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>Start a conversation</div>
            <div style={{ fontSize: 12, color: "#B0B0B0", lineHeight: 1.6 }}>Ask about the menu, availability, or anything else</div>
          </div>
        ) : messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const showTime = i === 0 || new Date(msg.created_at) - new Date(messages[i-1].created_at) > 300000;
          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: "center", fontSize: 10, color: "#C0C0C0", margin: "4px 0 8px", fontWeight: 600 }}>
                  {new Date(msg.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMine ? PRIMARY : "#fff",
                  color: isMine ? "#fff" : DARK,
                  fontSize: 14, lineHeight: 1.5, fontWeight: 500,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #F0EDE8", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value.slice(0, 500))}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          rows={1}
          style={{ flex: 1, border: "1.5px solid #EBEBEB", borderRadius: 20, padding: "10px 14px", fontSize: 14, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", background: "#F7F5F2" }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ width: 42, height: 42, borderRadius: "50%", background: text.trim() ? PRIMARY : "#E0E0E0", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Owner Chat List — shows all customer conversations ──
function OwnerChatList({ restaurantId, ownerId, onSelectChat, onClose }) {
  const { conversations, loading } = useOwnerChats(restaurantId);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 300, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: PRIMARY, padding: "max(env(safe-area-inset-top), 52px) 20px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Customer Messages</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#F7F5F2" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#B0B0B0" }}>Loading...</div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>No messages yet</div>
            <div style={{ fontSize: 12, color: "#B0B0B0", marginTop: 4 }}>Customers can message you from your restaurant page</div>
          </div>
        ) : conversations.map(conv => (
          <div key={conv.id} onClick={() => onSelectChat(conv)}
            style={{ background: "#fff", borderBottom: "1px solid #F0EDE8", padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${PRIMARY}, PRIMARY_DARK)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {conv.profiles?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>{conv.profiles?.full_name || "Customer"}</div>
              <div style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message || "No messages yet"}</div>
            </div>
            {conv.last_message_at && (
              <div style={{ fontSize: 10, color: "#C0C0C0", flexShrink: 0 }}>
                {timeAgo(conv.last_message_at)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── PaymentSettingsCard — restaurant payment method toggles ──
function PaymentSettingsCard({ ownerR, togglePaymentMethod }) {
  const [localOnline, setLocalOnline] = useState(ownerR?.accepts_online !== false);
  const [localCash,   setLocalCash]   = useState(ownerR?.accepts_cash   !== false);

  useEffect(() => {
    setLocalOnline(ownerR?.accepts_online !== false);
    setLocalCash(ownerR?.accepts_cash !== false);
  }, [ownerR?.accepts_online, ownerR?.accepts_cash]);

  async function toggle(method, current, setLocal) {
    setLocal(v => !v); // optimistic
    await togglePaymentMethod(method, current);
  }

  const methods = [
    {
      key:     "accepts_online",
      local:   localOnline,
      setLocal: setLocalOnline,
      icon:    "💳",
      label:   "Online payment",
      sub:     "Customers pay with card via Paystack",
      color:   "#2563EB",
      bg:      "#EFF6FF",
    },
    {
      key:     "accepts_cash",
      local:   localCash,
      setLocal: setLocalCash,
      icon:    "💵",
      label:   "Cash payment",
      sub:     "Pay on pickup or delivery",
      color:   "#16A34A",
      bg:      "#F0FDF4",
    },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Payment Methods</div>
      {methods.map(m => (
        <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #F7F5F2" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: m.local ? m.bg : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "background 0.2s", flexShrink: 0 }}>
            {m.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.local ? "#1C1C1E" : "#C0C0C0", marginBottom: 2, transition: "color 0.2s" }}>{m.label}</div>
            <div style={{ fontSize: 11, color: "#B0B0B0" }}>{m.sub}</div>
          </div>
          <div
            onClick={() => toggle(m.key, m.local, m.setLocal)}
            style={{
              width: 48, height: 26, borderRadius: 13, flexShrink: 0,
              background: m.local ? "#16A34A" : "#E0E0E0",
              position: "relative", cursor: "pointer", transition: "background 0.25s",
            }}
          >
            <div style={{
              position: "absolute", top: 3,
              left: m.local ? 24 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", transition: "left 0.25s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
        </div>
      ))}
      {!localOnline && !localCash && (
        <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, marginTop: 10, padding: "8px 10px", background: "#FEF2F2", borderRadius: 10 }}>
          ⚠️ At least one payment method must be enabled
        </div>
      )}
    </div>
  );
}


// ── PayoutAccountCard — bank details for restaurant owner ────
function PayoutAccountCard({ ownerR }) {
  const [editing, setEditing]     = useState(false);
  const [bank, setBank]           = useState({
    bankName:      ownerR?.bank_name       || "",
    bankCode:      ownerR?.bank_code       || "",
    accountNumber: ownerR?.account_number  || "",
    accountName:   ownerR?.account_name    || "",
    verified:      ownerR?.account_verified || false,
  });
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Keep in sync if ownerR changes (e.g., realtime update)
  useEffect(() => {
    setBank({
      bankName:      ownerR?.bank_name       || "",
      bankCode:      ownerR?.bank_code       || "",
      accountNumber: ownerR?.account_number  || "",
      accountName:   ownerR?.account_name    || "",
      verified:      ownerR?.account_verified || false,
    });
  }, [ownerR?.id]);

  const handleSave = async () => {
    if (!bank.verified) { setSaveErr("Please verify your account first"); return; }
    setSaving(true);
    setSaveErr("");
    const { error } = await supabase.from("restaurants").update({
      bank_name:        bank.bankName,
      bank_code:        bank.bankCode,
      account_number:   bank.accountNumber,
      account_name:     bank.accountName,
      account_verified: true,
      bank_updated_at:  new Date().toISOString(),
    }).eq("id", ownerR.id);
    setSaving(false);
    if (error) { setSaveErr(error.message); return; }
    setEditing(false);
  };

  const hasAccount = ownerR?.account_number && ownerR?.account_verified;
  const updatedAt  = ownerR?.bank_updated_at
    ? new Date(ownerR.bank_updated_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px" }}>Payout Account</div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: BG_SOFT, border: "none", borderRadius: 999, padding: "5px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {hasAccount ? "Update" : "+ Add"}
          </button>
        )}
      </div>

      {!editing && (
        hasAccount ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E", marginBottom: 2 }}>{ownerR.bank_name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>****{ownerR.account_number.slice(-4)} · {ownerR.account_name}</div>
            {updatedAt && <div style={{ fontSize: 10, color: "#B0B0B0", marginTop: 4 }}>Updated {updatedAt}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#B0B0B0" }}>No payout account linked. Add one to receive payments.</div>
        )
      )}

      {editing && (
        <div>
          <BankDetailsForm value={bank} onChange={setBank} disabled={saving} />
          {saveErr && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10 }}>{saveErr}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setEditing(false); setSaveErr(""); }}
              style={{ flex: 1, padding: "10px", background: "#F5F5F5", color: "#888", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!bank.verified || saving}
              style={{ flex: 2, padding: "10px", background: bank.verified ? PRIMARY : "#F5F5F5", color: bank.verified ? "#fff" : "#C0C0C0", border: "none", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: bank.verified ? "pointer" : "not-allowed", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {saving ? "Saving..." : "Save Account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Opening Hours Card (collapsible) ────────────────────────
function OpeningHoursCard({ ownerR, updateOpeningHours }) {
  const DAYS   = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const LABELS = { monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun" };

  const defaultHours = DAYS.reduce((acc, day) => ({
    ...acc,
    [day]: { open: "08:00", close: "22:00", enabled: true },
  }), {});

  const [hours,    setHours]    = useState(() => ownerR?.opening_hours || defaultHours);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (ownerR?.opening_hours) setHours(ownerR.opening_hours);
  }, [ownerR?.id]);

  function update(day, field, value) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  async function save() {
    setSaving(true);
    await updateOpeningHours(hours);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Build a one-line summary like "Mon–Sat • 8am–10pm" or "5 days open"
  function summary() {
    const enabled = DAYS.filter(d => hours[d]?.enabled);
    if (enabled.length === 0) return "Closed all week";
    if (enabled.length === 7) {
      const h = hours[enabled[0]];
      return `Every day • ${fmt12(h.open)}–${fmt12(h.close)}`;
    }
    const firstH = hours[enabled[0]];
    const allSame = enabled.every(d => hours[d].open === firstH.open && hours[d].close === firstH.close);
    if (allSame) {
      const first = LABELS[enabled[0]];
      const last  = LABELS[enabled[enabled.length - 1]];
      const range = first === last ? first : `${first}–${last}`;
      return `${range} • ${fmt12(firstH.open)}–${fmt12(firstH.close)}`;
    }
    return `${enabled.length} days open`;
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", marginBottom: 14, overflow: "hidden" }}>
      {/* Header row — always visible, tap to expand */}
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Opening Hours</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{summary()}</div>
        </div>
        <span style={{ fontSize: 18, color: "#C0C0C0", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
      </div>

      {/* Expanded schedule */}
      {expanded && (
        <div style={{ padding: "0 18px 16px", borderTop: "1px solid #F7F5F2" }}>
          {DAYS.map(day => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #F7F5F2" }}>
              <span style={{ width: 30, fontSize: 11, fontWeight: 700, color: hours[day]?.enabled ? DARK : "#C0C0C0", flexShrink: 0 }}>{LABELS[day]}</span>
              <Toggle checked={hours[day]?.enabled ?? true} onChange={() => update(day, "enabled", !hours[day]?.enabled)} />
              {hours[day]?.enabled ? (
                <>
                  <input type="time" value={hours[day]?.open || "08:00"}
                    onChange={e => update(day, "open", e.target.value)}
                    style={{ flex: 1, minWidth: 0, border: "1px solid #EBEBEB", borderRadius: 8, padding: "5px 6px", fontSize: 12, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", background: BG }} />
                  <span style={{ fontSize: 10, color: "#C0C0C0", flexShrink: 0 }}>–</span>
                  <input type="time" value={hours[day]?.close || "22:00"}
                    onChange={e => update(day, "close", e.target.value)}
                    style={{ flex: 1, minWidth: 0, border: "1px solid #EBEBEB", borderRadius: 8, padding: "5px 6px", fontSize: 12, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", background: BG }} />
                </>
              ) : (
                <span style={{ fontSize: 11, color: "#C0C0C0", flex: 1 }}>Closed</span>
              )}
            </div>
          ))}
          {saved && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 10 }}>✓ Hours saved</div>}
          <button onClick={save} disabled={saving}
            style={{ width: "100%", marginTop: 14, padding: "12px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save Hours"}
          </button>
        </div>
      )}
    </div>
  );
}


// ── Post Media Card (video/photo for TikTok feed) ─────────────
// ── Post Media Card (video/photo for TikTok feed) ─────────────
// SETUP REQUIRED in Supabase before uploads work:
//
// 1. Storage bucket:
//    Supabase Dashboard → Storage → Create bucket → name: "post-media" → Public: ON
//
// 2. Storage policy (allow authenticated uploads):
//    In the post-media bucket → Policies → New policy → For full customization:
//      Policy name: "Authenticated users can upload"
//      Allowed operation: INSERT
//      Target roles: authenticated
//      Policy definition: bucket_id = 'post-media'
//
// 3. RLS policy on posts table (allow owners to insert):
//    Run in Supabase SQL Editor:
//      CREATE POLICY "owners can create posts" ON posts
//      FOR INSERT WITH CHECK (
//        auth.uid() = (SELECT owner_id FROM restaurants WHERE id = restaurant_id)
//      );
function PostMediaCard({ ownerR, uploadPostMedia, createPost }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");
  const fileRef               = useRef();

  const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB
  const IMAGE_MAX = 10 * 1024 * 1024; // 10 MB

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setErr(""); setDone(false);
    const vid = f.type.startsWith("video/");
    setIsVideo(vid);

    // File size check
    if (vid && f.size > VIDEO_MAX) {
      setErr("Video must be 50 MB or less.");
      return;
    }
    if (!vid && f.size > IMAGE_MAX) {
      setErr("Image must be 10 MB or less.");
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);

    // Validate video duration (max 60s)
    if (vid) {
      const url = URL.createObjectURL(f);
      const video = document.createElement("video");
      video.src = url;
      video.onloadedmetadata = () => {
        if (video.duration > 61) {
          setErr("Video must be 60 seconds or less.");
          setFile(null); setPreview(null);
        }
        URL.revokeObjectURL(url);
      };
    }
  }

  async function submit() {
    if (!file) return;
    setUploading(true); setProgress(0); setErr("");
    const { url, isVideo: iv, error: upErr } = await uploadPostMedia(file, setProgress);
    if (upErr) { setErr(upErr.message || "Upload failed"); setUploading(false); return; }
    const { error: postErr } = await createPost({
      postType:  iv ? "update" : "new",
      text:      caption.trim(),
      mediaUrl:  url,
      mediaType: iv ? "video" : "photo",
    });
    if (postErr) { setErr(postErr.message || "Failed to post"); setUploading(false); return; }
    setFile(null); setPreview(null); setCaption(""); setUploading(false); setProgress(0); setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "16px 16px 4px", fontSize: 13, fontWeight: 800, color: DARK }}>Post to Feed</div>
      <div style={{ padding: "4px 16px 14px", fontSize: 11, color: "#888" }}>Share a video (max 60s / 50 MB) or photo (max 10 MB)</div>
      <div style={{ padding: "0 16px 16px" }}>
        {/* No capture attribute — allows gallery access, not camera-only */}
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview
          ? <div onClick={() => fileRef.current?.click()} style={{ height: 140, background: BG, borderRadius: 14, border: "1.5px dashed #EBEBEB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 28 }}>🎬</span>
              <span style={{ fontSize: 13, color: "#B0B0B0", fontWeight: 600 }}>Tap to add a video or photo</span>
            </div>
          : <div style={{ position: "relative" }}>
              {isVideo
                ? <video src={preview} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 14, display: "block" }} controls playsInline muted />
                : <img src={preview} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 14 }} />
              }
              <button onClick={() => { setFile(null); setPreview(null); setErr(""); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
              <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#fff" }}>{isVideo ? "📹 Video" : "📷 Photo"}</div>
            </div>
        }
        {preview && (
          <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 150))} placeholder="Caption (optional)..."
            style={{ width: "100%", marginTop: 10, border: "none", background: BG, outline: "none", borderRadius: 12, padding: "10px 12px", fontSize: 13, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", minHeight: 54 }} />
        )}
        {err  && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginTop: 8 }}>{err}</div>}
        {done && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 8 }}>✓ Posted to the Chowli feed!</div>}
        {uploading && progress > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Uploading…</span>
              <span style={{ fontSize: 11, color: PRIMARY, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: "#F0EDE8", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: PRIMARY, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
        {preview && (
          <button disabled={uploading} onClick={submit}
            style={{ width: "100%", marginTop: 12, padding: "13px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "Post to Feed"}
          </button>
        )}
      </div>
    </div>
  );
}


// ── Owner Location Card ──────────────────────────────────────
function LocationCard({ ownerR }) {
  const [state,  setState]  = useState(ownerR?.state ?? "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => { setState(ownerR?.state ?? ""); }, [ownerR?.id]);

  async function save() {
    setSaving(true); setSaved(false);
    await supabase.from("restaurants").update({ state: state.trim() || null }).eq("id", ownerR.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Region / State</div>
      <div style={{ fontSize: 12, color: "#B0B0B0", marginBottom: 10 }}>Customers nearby will find your restaurant first.</div>
      <input
        value={state}
        onChange={e => setState(e.target.value)}
        placeholder="e.g. Sokoto, Lagos State, Abuja"
        style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, padding: "11px 14px", fontSize: 13, color: DARK, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box", marginBottom: 12 }}
      />
      <button onClick={save} disabled={saving}
        style={{ width: "100%", padding: "11px", background: saved ? "#16A34A" : PRIMARY, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "background 0.2s" }}>
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Region"}
      </button>
    </div>
  );
}

// ── Offline / slow connection detection ──────────────────────
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

function OfflineBanner() {
  return (
    <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#1C1C1E", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center", padding: "10px 16px", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span>📡</span> No internet connection — showing cached data
    </div>
  );
}

// ── Skeleton cards for home loading state ─────────────────────
function VCardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: 14, display: "flex", gap: 14, border: "1px solid #F0EDE8" }}>
      <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
        <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: "40%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: "90%", borderRadius: 6 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <div className="skeleton" style={{ height: 18, width: 50, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 18, width: 60, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

function HCardSkeleton() {
  return (
    <div style={{ flexShrink: 0, width: 190, background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #F0EDE8" }}>
      <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 0 }} />
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="skeleton" style={{ height: 13, width: "80%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: "50%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 10, width: "60%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, isOwner }) {
  const items = [
    { id: "home",      label: "Home",      SVG: HomeSVG      },
    { id: "feed",      label: "Feed",      SVG: FeedSVG      },
    { id: "favorites", label: "Favorites", SVG: FavoritesSVG },
    { id: "orders",    label: "Orders",    SVG: OrdersSVG    },
    ...(isOwner ? [{ id: "store", label: "Store", SVG: StoreSVG }] : []),
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #F0EDE8", display: "flex", paddingTop: 10, paddingBottom: "calc(14px + env(safe-area-inset-bottom))", zIndex: 100 }}>
      {items.map(({ id, label, SVG }) => {
        const active = tab === id || (tab === "detail" && id === "home");
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="nav-btn"
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", padding: "2px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}
          >
            <SVG active={active} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? PRIMARY : TEXT_MUTED }}>{label}</span>
            {active && <div className="tab-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />}
          </button>
        );
      })}
    </nav>
  );
}

const HomeSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V12h6v9" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SearchSVG = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2"/><path d="M21 21l-3.5-3.5" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round"/></svg>;
const FeedSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2"/><path d="M6 1v3M10 1v3M14 1v3" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round"/></svg>;
const CartSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="21" r="1.5" fill={active ? PRIMARY : TEXT_MUTED}/><circle cx="19" cy="21" r="1.5" fill={active ? PRIMARY : TEXT_MUTED}/><path d="M2 3h2l2.68 10.39a2 2 0 0 0 1.94 1.61h9.72a2 2 0 0 0 1.94-1.51L22 7H6" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StoreSVG  = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l1-6h16l1 6" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2"/><path d="M5 21V9M19 9v12M5 21h14" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const OrdersSVG    = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2"/><path d="M9 12h6M9 16h4" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round"/></svg>;
const FavoritesSVG = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? PRIMARY : "none"} stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const ProfileSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? PRIMARY : TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;

// Reusable cart icon button for all header areas
function HeaderCartBtn({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="View cart"
      style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.22)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="21" r="1.5" fill="#fff"/>
        <circle cx="19" cy="21" r="1.5" fill="#fff"/>
        <path d="M2 3h2l2.68 10.39a2 2 0 0 0 1.94 1.61h9.72a2 2 0 0 0 1.94-1.51L22 7H6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {count > 0 && (
        <div style={{ position: "absolute", top: -2, right: -2, background: PRIMARY, color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(139,26,26,0.9)" }}>
          {count > 9 ? "9+" : count}
        </div>
      )}
    </button>
  );
}

// Cart button for screens with a light/white header background
function HeaderCartBtnLight({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="View cart"
      style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: BG_SOFT, border: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="21" r="1.5" fill={PRIMARY}/>
        <circle cx="19" cy="21" r="1.5" fill={PRIMARY}/>
        <path d="M2 3h2l2.68 10.39a2 2 0 0 0 1.94 1.61h9.72a2 2 0 0 0 1.94-1.51L22 7H6" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {count > 0 && (
        <div style={{ position: "absolute", top: -2, right: -2, background: PRIMARY, color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
          {count > 9 ? "9+" : count}
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const { user, profile, loading: authLoading, isOwner, isAdmin, signUp, signIn, signInWithMagicLink, signOut, refreshProfile } = useAuth();
  const { restaurants, loading: restLoading } = useRestaurants();
  const { posts, likedIds, toggleLike, loading: feedLoading, error: feedError, loadingMore, hasMore, fetchMore, fetchComments, addComment } = useFeed(user?.id);
  const { grouped: storyGroups, markViewed }  = useStories(user?.id);
  const cart                                  = useCart();
  const { makeReservation, submitting: resSub, error: resErr } = useReservations(user?.id);
  const { orders: customerOrders, refetch: refetchOrders } = useOrders(user?.id);
  const { reviewedOrderIds, submitReview }   = useReviews(user?.id);
  const { application, submitting: regSub, error: regErr, submitApplication } = useRegistration(user?.id);
  const chatUnread = useUnreadCount(user?.id);
  const isOnline   = useOnlineStatus();
  usePushNotifications(user?.id); // request permission + save FCM token
  const { favorites, toggleFavorite } = useFavorites(user?.id);

  const [appState, setAppState]       = useState("splash");
  const [authMode, setAuthMode]       = useState(null);
  const [tab, setTab]                 = useState("home");
  const [selectedId, setSelectedId]   = useState(null);
  const [detailTab, setDetailTab]     = useState("menu");
  const [detailMenu, setDetailMenu]   = useState([]);   // menu_categories + items for customer detail view
  const [detailMenuLoading, setDetailMenuLoading] = useState(false);
  const [ownerMenu, setOwnerMenu]     = useState([]);   // menu_categories + items for owner dashboard
  const [ownerMenuLoading, setOwnerMenuLoading] = useState(false);
  const [ownerRId, setOwnerRId]       = useState(null);
  const [activeCat, setActiveCat]     = useState("All");
  const [search, setSearch]           = useState("");
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [showReservation, setShowReservation]   = useState(null); // restaurant object

  // Composer state
  const [composing, setComposing] = useState(false);
  const [postType, setPostType]   = useState("update");
  const [postText, setPostText]   = useState("");

  // Overlay screens
  const [showProfile, setShowProfile]         = useState(false);
  const [emailConfirmHint, setEmailConfirmHint] = useState(false);
  const [showRegister, setShowRegister]       = useState(false);
  const [reviewTarget, setReviewTarget]       = useState(null); // order to review

  // Confirm "clear cart?" when switching restaurant
  const [pendingItem, setPendingItem] = useState(null); // { menuItem, restaurant }
  const [showAddItem, setShowAddItem]   = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null); // menu item object; null = sheet closed
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeChat, setActiveChat]     = useState(null); // restaurant object for customer chat
  const [showOwnerChats, setShowOwnerChats] = useState(false);
  const [ownerChatTarget, setOwnerChatTarget] = useState(null); // conv for owner reply
  const [userLocation, setUserLocation]     = useState(null);  // { state } from reverse-geocode — display only

  // ── Search page extra filter state ──────────────────────────
  const [searchOpenOnly,   setSearchOpenOnly]   = useState(false);
  const [searchActiveCats, setSearchActiveCats] = useState(new Set()); // multi-select
  const [searchMinRating,  setSearchMinRating]  = useState(0);         // 0 = no filter
  const [searchMenuItems,  setSearchMenuItems]  = useState([]);        // [{ item, restaurant }]

  useEffect(() => {
    if (appState !== "splash") return;
    const timer = setTimeout(() => setAppState(localStorage.getItem("chowli_onboarded") ? "app" : "onboarding"), 2500);
    return () => clearTimeout(timer);
  }, [appState]);

  // ── Geolocation — detect user's state for nearby filtering ──
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const state = data.address?.state || null;
        if (state) setUserLocation({ state });
      } catch { /* no filtering if reverse geocode fails */ }
    }, () => { /* permission denied */ }, { timeout: 8000 });
  }, []);

  // ── Shared helper: fetch categories + items without FK embed ambiguity ──
  // Queries categories and items as two separate requests, then zips them.
  async function fetchMenuForRestaurant(restaurantId) {
    const { data: cats } = await supabase
      .from("menu_categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true });

    if (!cats?.length) return [];

    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name, price, is_available, sort_order, image_url, category_id")
      .in("category_id", cats.map(c => c.id))
      .order("sort_order", { ascending: true });

    // Fetch per-item ratings from the view and merge onto items
    const itemIds = (items || []).map(i => i.id);
    let ratingsLookup = {};
    if (itemIds.length) {
      const { data: ratingRows } = await supabase
        .from("menu_item_ratings")
        .select("menu_item_id, avg_rating, review_count")
        .in("menu_item_id", itemIds);
      (ratingRows || []).forEach(r => { ratingsLookup[r.menu_item_id] = r; });
    }

    const mergedItems = (items || []).map(i => ({
      ...i,
      avg_rating:   ratingsLookup[i.id]?.avg_rating   ?? null,
      review_count: ratingsLookup[i.id]?.review_count ?? 0,
    }));

    return cats.map(cat => ({
      ...cat,
      menu_items: mergedItems.filter(i => i.category_id === cat.id),
    }));
  }

  // ── Fetch menu when a restaurant detail is opened ────────────
  useEffect(() => {
    if (!selectedId) { setDetailMenu([]); return; }
    setDetailMenuLoading(true);
    fetchMenuForRestaurant(selectedId).then(menu => {
      console.log("[detailMenu] fetched for", selectedId, "→", menu.length, "cats,",
        menu.reduce((n, c) => n + c.menu_items.length, 0), "items");
      setDetailMenu(menu);
      setDetailMenuLoading(false);
    });
  }, [selectedId]);

  // ── Fix 3: Hardware back button — go back instead of exiting ──
  useEffect(() => {
    function handlePopState() {
      if (showProfile)        { setShowProfile(false);    history.pushState(null, ""); return; }
      if (showRegister)       { setShowRegister(false);   history.pushState(null, ""); return; }
      if (activeStoryGroup)   { setActiveStoryGroup(null);history.pushState(null, ""); return; }
      if (reviewTarget)       { setReviewTarget(null);    history.pushState(null, ""); return; }
      if (showReservation)    { setShowReservation(null); history.pushState(null, ""); return; }
      if (showAnalytics)      { setShowAnalytics(false);  history.pushState(null, ""); return; }
      if (activeChat)         { setActiveChat(null);      history.pushState(null, ""); return; }
      if (showOwnerChats)     { setShowOwnerChats(false); history.pushState(null, ""); return; }
      if (ownerChatTarget)    { setOwnerChatTarget(null); history.pushState(null, ""); return; }
      if (pendingItem)        { setPendingItem(null);     history.pushState(null, ""); return; }
      if (tab === "detail")   { setTab("home");           history.pushState(null, ""); return; }
      if (tab === "cart")     { setTab("home");           history.pushState(null, ""); return; }
      if (tab !== "home")     { setTab("home");           history.pushState(null, ""); return; }
    }
    history.pushState(null, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [tab, showProfile, showRegister, activeStoryGroup, reviewTarget, showReservation, pendingItem, activeChat, showOwnerChats, ownerChatTarget, showAnalytics]);

  // ── Search: query menu items when search text changes ───────
  useEffect(() => {
    if (tab !== "search" || !search.trim()) { setSearchMenuItems([]); return; }
    const s = search.toLowerCase();
    supabase
      .from("menu_items")
      .select("id, name, price, restaurant_id, is_available, image_url")
      .ilike("name", `%${s}%`)
      .eq("is_available", true)
      .limit(20)
      .then(({ data }) => {
        if (!data) return;
        const withRest = data
          .map(item => {
            const restaurant = restaurants.find(r => r.id === item.restaurant_id);
            return restaurant ? { item, restaurant } : null;
          })
          .filter(Boolean);
        setSearchMenuItems(withRest);
      });
  }, [search, tab]);

  const selected  = restaurants.find(r => r.id === selectedId);
  const ownerR    = restaurants.find(r => r.id === ownerRId) || restaurants.find(r => r.owner_id === user?.id);

  // ── Fetch menu for owner dashboard (must be after ownerR is declared) ──
  async function refetchOwnerMenu() {
    if (!ownerR?.id) return;
    setOwnerMenuLoading(true);
    const menu = await fetchMenuForRestaurant(ownerR.id);
    setOwnerMenu(menu);
    setOwnerMenuLoading(false);
  }
  useEffect(() => {
    if (!ownerR?.id) { setOwnerMenu([]); return; }
    refetchOwnerMenu();
  }, [ownerR?.id]);

  const openCount = restaurants.filter(r => r.is_open).length;
  const isOwnRestaurant = !!(user && selected?.owner_id === user.id);
  const { toggleOpen, toggleItem, updateItemImage, uploadFoodImage, uploadLogo, uploadBanner, createPost, saving, togglePaymentMethod, updateOpeningHours, uploadPostMedia } = useOwnerRestaurant(ownerR?.id);
  const { unreadCount: ownerUnread } = useOwnerChats(ownerR?.id || null);
  const { orders: incomingOrders, fetchOrders: fetchIncoming, updateStatus } = useIncomingOrders(ownerR?.id);

  const [loyaltyMembersCount, setLoyaltyMembersCount] = useState(0);
  const [deliveryPhotos, setDeliveryPhotos] = useState({}); // orderId → true
  useEffect(() => {
    if (!ownerR?.id) return;
    supabase
      .from("loyalty_points")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", ownerR.id)
      .then(({ count }) => setLoyaltyMembersCount(count || 0));
  }, [ownerR?.id]);

  // Dynamic categories from actual restaurant data (Feature 5)
  const dynamicCats = ["All", ...new Set(
    restaurants.flatMap(r => Array.isArray(r.category) ? r.category : (r.category ? [r.category] : []))
  )].filter(Boolean);

  // Home screen filter — single category + text search
  const filtered = restaurants.filter(r => {
    const cats = Array.isArray(r.category) ? r.category : (r.category ? [r.category] : []);
    const mc = activeCat === "All" || cats.includes(activeCat);
    if (!mc) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    if (r.name.toLowerCase().includes(s)) return true;
    return cats.some(c => c.toLowerCase().includes(s));
  });

  // Search page filter — multi-category, open now, min rating (Feature 3)
  const searchFiltered = restaurants.filter(r => {
    if (searchActiveCats.size > 0) {
      const cats = Array.isArray(r.category) ? r.category : (r.category ? [r.category] : []);
      if (!cats.some(c => searchActiveCats.has(c))) return false;
    }
    if (searchOpenOnly && !r.is_open) return false;
    if (searchMinRating > 0 && (r.avg_rating || 0) < searchMinRating) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const cats = Array.isArray(r.category) ? r.category : (r.category ? [r.category] : []);
      const nameMatch = r.name.toLowerCase().includes(s);
      const catMatch  = cats.some(c => c.toLowerCase().includes(s));
      const tagMatch  = (r.tags || []).some(t => t.toLowerCase().includes(s));
      if (!nameMatch && !catMatch && !tagMatch) return false;
    }
    return true;
  });

  const openNow = restaurants.filter(r => r.is_open).slice(0, 4);

  function toggleSearchCat(cat) {
    setSearchActiveCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }
  function clearSearchFilters() {
    setSearchActiveCats(new Set());
    setSearchOpenOnly(false);
    setSearchMinRating(0);
    setSearch("");
  }

  function goDetail(id) { setSelectedId(id); setDetailTab("menu"); setTab("detail"); }

  function handleAddToCart(menuItem, restaurant) {
    if (!user) { setAuthMode("login"); return; }
    if (cart.isDifferentRestaurant(restaurant.id)) {
      setPendingItem({ menuItem, restaurant }); return;
    }
    cart.addItem(menuItem, restaurant);
  }

  function confirmClearAndAdd() {
    if (!pendingItem) return;
    cart.clearCart();
    cart.addItem(pendingItem.menuItem, pendingItem.restaurant);
    setPendingItem(null);
  }

  function handleTabChange(id) {
    if ((id === "store" || id === "orders") && !user) { setAuthMode("login"); return; }
    if (id === "store" && isOwner) fetchIncoming();
    if (id === "orders") refetchOrders();
    setTab(id);
  }

  // ── Reorder — repopulate cart from a past order ──────────
  function handleReorder(order) {
    if (!order?.order_items?.length) return;
    const restaurant = order.restaurants;
    if (!restaurant) return;

    if (cart.restaurantId && cart.restaurantId !== restaurant.id) {
      // Different restaurant — would need to clear cart
      // Set pendingReorder so the existing clear-cart dialog handles it
      cart.clearCart();
    }

    order.order_items.forEach(item => {
      // menu_item_id is the FK to menu_items — must be present and valid.
      // item.id is the order_items row UUID, which is NOT a valid menu_items FK.
      if (!item.menu_item_id) return; // skip items from old orders that lack menu_item_id
      const menuItem = { id: item.menu_item_id, name: item.name, price: item.price };
      for (let i = 0; i < item.quantity; i++) {
        cart.addItem(menuItem, restaurant);
      }
    });
    setTab("cart");
  }

  async function submitPost() {
    if (!postText.trim() || !ownerR) return;
    await createPost({ postType, text: postText.trim() });
    setPostText(""); setComposing(false);
  }

  // ── Splash ───────────────────────────────────────────────
  if (appState === "splash") return (
    <div style={{ position: "fixed", inset: 0, background: PRIMARY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", maxWidth: 430, margin: "0 auto" }}>
      <style>{`
        @keyframes chowliReveal {
          from { width: 0; }
          to   { width: 5.6ch; }
        }
        @keyframes splashSubFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div style={{ overflow: "hidden", whiteSpace: "nowrap", width: "5.6ch" }}>
        <div style={{
          fontSize: 62,
          fontWeight: 800,
          color: ACCENT,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          width: 0,
          animation: "chowliReveal 0.9s steps(6, end) 0.1s forwards",
        }}>Chowli</div>
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 500,
        color: "rgba(244,196,48,0.75)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        marginTop: 14,
        opacity: 0,
        animation: "splashSubFade 0.5s ease 1.1s forwards",
      }}>Your local food market</div>
    </div>
  );

  if (appState === "onboarding") return <Onboarding onDone={() => { localStorage.setItem("chowli_onboarded", "1"); setAppState("app"); }} />;

  const authWrap = children => <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh" }}><style>{`* { box-sizing:border-box; margin:0; padding:0; }`}</style>{children}</div>;
  if (authMode === "login")  return authWrap(
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", position: "relative" }}>
      {emailConfirmHint && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "#F0FDF4", borderBottom: "1px solid #BBF7D0", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ fontSize: 16 }}>✉️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>Check your email</div>
            <div style={{ fontSize: 11, color: "#4ADE80" }}>We sent a confirmation link. Click it, then sign in.</div>
          </div>
          <button onClick={() => setEmailConfirmHint(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#16A34A" }}>✕</button>
        </div>
      )}
      <LoginScreen signIn={signIn} onSignUp={() => { setEmailConfirmHint(false); setAuthMode("signup"); }} onForgot={() => setAuthMode("forgot")} onBack={() => { setEmailConfirmHint(false); setAuthMode(null); }} />
    </div>
  );
  if (authMode === "signup") return authWrap(
    <SignUpScreen
      signUp={signUp}
      onLogin={(hint) => {
        setAuthMode("login");
        // If signup required email confirm, show a note on the login page
        if (hint === "check-email") setEmailConfirmHint(true);
      }}
      onBack={() => setAuthMode(null)}
    />
  );
  if (authMode === "forgot") return authWrap(<ForgotScreen signInWithMagicLink={signInWithMagicLink} onBack={() => setAuthMode("login")} />);

  if (authLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}><img src="/logo.png" alt="Chowli" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", marginBottom: 12, animation: "floatUp 1.4s ease-in-out infinite" }} /><div style={{ fontSize: 14, color: "#888", fontWeight: 600 }}>Loading Chowli...</div></div>
    </div>
  );

  // ── Email verification gate ───────────────────────────────────
  // Only shown to logged-in users who haven't confirmed their email yet.
  // EmailVerification calls supabase.auth.refreshSession() which fires
  // onAuthStateChange in useAuth → updates `user` → gate disappears automatically.
  if (user && !user.email_confirmed_at) return (
    <EmailVerification
      user={user}
      onVerified={() => {}}
    />
  );

  // ── Phone verification gate — DISABLED for online-only launch ──
  // Re-enable this block (and the PhoneVerification import above) when cash orders return.
  // if (user && user.email_confirmed_at && profile && !profile.phone_verified) return (
  //   <PhoneVerification user={user} onVerified={async () => { await refreshProfile(); }} />
  // );

  return (
    <>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${BG}; overscroll-behavior: none; }
        .chowli { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 430px; margin: 0 auto; min-height: 100vh; background: ${BG}; padding-bottom: calc(80px + env(safe-area-inset-bottom)); overflow-x: hidden; -webkit-tap-highlight-color: transparent; }
        .hscroll { display: flex; gap: 14px; padding: 0 20px 4px; overflow-x: auto; scrollbar-width: none; }
        .hscroll::-webkit-scrollbar { display: none; }
        .vlist { display: flex; flex-direction: column; gap: 10px; padding: 0 20px; }
        .story-row { display: flex; gap: 14px; padding: 18px 20px 4px; overflow-x: auto; scrollbar-width: none; }
        .story-row::-webkit-scrollbar { display: none; }
        input, textarea, button { font-family: 'Plus Jakarta Sans', sans-serif; }

        /* ── Skeleton shimmer ── */
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton { background: linear-gradient(90deg, #F0EDE8 25%, #E8E4DF 50%, #F0EDE8 75%); background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 8px; }

        /* ── Animations ── */
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes slideInCard { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tabDot { 0%{transform:scale(0)} 60%{transform:scale(1.5)} 100%{transform:scale(1)} }
        @keyframes cartBounce { 0%,100%{transform:translateX(-50%) translateY(0)} 35%{transform:translateX(-50%) translateY(-7px)} 65%{transform:translateX(-50%) translateY(-2px)} }
        @keyframes pulseBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes successPop { 0%{transform:scale(0.4) rotate(-10deg);opacity:0} 60%{transform:scale(1.18) rotate(3deg)} 80%{transform:scale(0.95) rotate(-1deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes confetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(60px) rotate(360deg);opacity:0} }
        .vlist > *:nth-child(1){animation:slideInCard 0.32s 0.05s both}
        .vlist > *:nth-child(2){animation:slideInCard 0.32s 0.10s both}
        .vlist > *:nth-child(3){animation:slideInCard 0.32s 0.15s both}
        .vlist > *:nth-child(4){animation:slideInCard 0.32s 0.20s both}
        .vlist > *:nth-child(n+5){animation:slideInCard 0.32s 0.25s both}
        .story-ring-wrap{animation:popIn 0.38s cubic-bezier(.36,.07,.19,.97) both}
        .cart-bar{animation:cartBounce 0.5s cubic-bezier(.36,.07,.19,.97)}
        .open-badge{animation:pulseBadge 2.4s ease-in-out infinite}
        .tab-dot{animation:tabDot 0.28s cubic-bezier(.36,.07,.19,.97) both}
        .nav-btn:active{transform:scale(0.86);transition:transform 0.1s}

        /* ── Open Now marquee ── */
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          gap: 14px;
          width: max-content;
          animation: marquee 28s linear infinite;
          padding-bottom: 4px;
        }
        .marquee-track:hover { animation-play-state: paused; }
        .marquee-outer {
          overflow: hidden;
          padding: 0 20px;
          cursor: default;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }

        /* ── Name bounce ── */
        @keyframes nameBounce {
          0%   { transform: translateY(0);    opacity: 1; }
          15%  { transform: translateY(-7px); opacity: 1; }
          30%  { transform: translateY(0);    opacity: 1; }
          45%  { transform: translateY(-4px); opacity: 1; }
          60%  { transform: translateY(0);    opacity: 1; }
          75%  { transform: translateY(-2px); opacity: 1; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        .name-bounce {
          display: inline-block;
          animation: nameBounce 0.9s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>

      <div className="chowli">
        {!isOnline && <OfflineBanner />}

        {/* ── Profile overlay ── */}
        {showProfile && (
          <ProfilePage
            user={user}
            onClose={() => setShowProfile(false)}
            onSignOut={() => { signOut(); setShowProfile(false); }}
            onRegister={() => { setShowProfile(false); setShowRegister(true); }}
          />
        )}

        {/* ── Register restaurant overlay ── */}
        {showRegister && (
          <RegisterRestaurant
            onClose={() => setShowRegister(false)}
            onSubmit={submitApplication}
            submitting={regSub}
            error={regErr}
          />
        )}

        {/* ── Review modal ── */}
        {reviewTarget && (
          <ReviewModal
            order={reviewTarget}
            onClose={() => setReviewTarget(null)}
            onSubmit={submitReview}
          />
        )}

        {/* ── Analytics overlay ── */}
        {showAnalytics && ownerR && (
          <AnalyticsScreen
            restaurantId={ownerR.id}
            restaurantName={ownerR.name}
            onClose={() => setShowAnalytics(false)}
          />
        )}

        {/* ── Add menu item modal ── */}
        {showAddItem && ownerR && (
          <AddMenuItemModal
            ownerR={ownerR}
            onClose={() => setShowAddItem(false)}
            onAdded={() => { setShowAddItem(false); refetchOwnerMenu(); }}
          />
        )}

        {/* ── Customer chat overlay ── */}
        {activeChat && user && (
          <ChatScreen
            user={user}
            restaurant={activeChat}
            onClose={() => setActiveChat(null)}
          />
        )}

        {/* ── Owner chat list overlay ── */}
        {showOwnerChats && ownerR && (
          <OwnerChatList
            restaurantId={ownerR.id}
            ownerId={user?.id}
            onSelectChat={(conv) => { setOwnerChatTarget(conv); setShowOwnerChats(false); }}
            onClose={() => setShowOwnerChats(false)}
          />
        )}

        {/* ── Owner reply to specific customer ── */}
        {ownerChatTarget && ownerR && (
          <ChatScreen
            key={ownerChatTarget.id}
            user={user}
            restaurant={{
              ...ownerR,
              name: ownerChatTarget.profiles?.full_name
                ? `Chat with ${ownerChatTarget.profiles.full_name}`
                : "Customer Chat",
            }}
            conversationId={ownerChatTarget.id}
            customerId={ownerChatTarget.customer_id}
            onClose={() => setOwnerChatTarget(null)}
          />
        )}

        {/* ── Story viewer overlay ── */}
        {activeStoryGroup && <StoryViewer group={activeStoryGroup} onClose={() => setActiveStoryGroup(null)} onViewed={markViewed} />}

        {/* ── Cart screen overlay ── */}
        {tab === "cart" && (
          <CartScreen
            cart={cart}
            user={user}
            onClose={() => setTab("home")}
            onSignIn={() => setAuthMode("login")}
            onOrderPlaced={() => { refetchOrders(); setTab("orders"); }}
            acceptsOnline={(() => { const r = restaurants.find(r => r.id === cart.restaurantId); return r?.accepts_online !== false; })()}
            acceptsCash={(() => { const r = restaurants.find(r => r.id === cart.restaurantId); return r?.accepts_cash !== false; })()}
          />
        )}

        {/* ── Reservation overlay ── */}
        {showReservation && (
          <ReservationScreen
            restaurant={showReservation}
            user={user}
            onClose={() => setShowReservation(null)}
            onSignIn={() => { setShowReservation(null); setAuthMode("login"); }}
            makeReservation={makeReservation}
            submitting={resSub}
            error={resErr}
          />
        )}

        {/* ── Clear cart confirmation ── */}
        {pendingItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto" }}>
            <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "28px 24px 40px", width: "100%" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8 }}>Start a new cart?</div>
              <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
                Your cart has items from <strong>{cart.restaurantName}</strong>. You can only order from one restaurant at a time. Clear your cart and add from {pendingItem.restaurant.name}?
              </div>
              <button onClick={confirmClearAndAdd} style={{ width: "100%", padding: 14, background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>Clear & switch restaurant</button>
              <button onClick={() => setPendingItem(null)} style={{ width: "100%", padding: 14, background: BG_SOFT, color: DARK, border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Keep current cart</button>
            </div>
          </div>
        )}

        {/* ── Persistent top-right cart icon for screens without their own header ── */}
        {!["home", "detail", "search", "cart"].includes(tab) && cart.totalItems > 0 && (
          <button
            onClick={() => setTab("cart")}
            aria-label="View cart"
            style={{ position: "fixed", top: "max(env(safe-area-inset-top), 12px)", right: 16, zIndex: 95, width: 40, height: 40, borderRadius: "50%", background: PRIMARY, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(139,26,26,0.35)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="21" r="1.5" fill="#fff"/>
              <circle cx="19" cy="21" r="1.5" fill="#fff"/>
              <path d="M2 3h2l2.68 10.39a2 2 0 0 0 1.94 1.61h9.72a2 2 0 0 0 1.94-1.51L22 7H6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ position: "absolute", top: -3, right: -3, background: ACCENT, color: PRIMARY, fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
              {cart.totalItems > 9 ? "9+" : cart.totalItems}
            </div>
          </button>
        )}

        {/* ── Menu item detail sheet ── */}
        {selectedMenuItem && (
          <MenuItemSheet
            item={selectedMenuItem}
            restaurant={selected}
            allItems={detailMenu.flatMap(c => c.menu_items || [])}
            cart={cart}
            onClose={() => setSelectedMenuItem(null)}
            onAddToCart={handleAddToCart}
            favorites={user ? favorites : null}
            toggleFavorite={user ? toggleFavorite : null}
          />
        )}

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            {/* ── Chowli-style vibrant gradient header ── */}
            <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 60%, #5A1010 100%)`, padding: "max(env(safe-area-inset-top), 52px) 20px 24px", position: "relative", overflow: "hidden" }}>
              {/* Decorative blobs */}
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -20, left: 40, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => user ? setShowProfile(true) : setAuthMode("login")}
                    style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.22)", border: "2.5px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
                    {user ? (profile?.full_name?.[0]?.toUpperCase() || "U") : "👤"}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{greet()},</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
                      <span className="name-bounce" key={user?.id || "guest"}>
                        {user ? `${profile?.full_name?.split(" ")[0] || "there"}! 👋` : "Guest 👋"}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="open-badge" style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: "#fff", padding: "4px 12px", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>{openCount} open</div>
                  <button onClick={() => setTab("search")}
                    style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.22)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    aria-label="Search">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2.2"/>
                      <path d="M21 21l-3.5-3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <HeaderCartBtn count={cart.totalItems} onClick={() => setTab("cart")} />
                </div>
              </div>

              {/* Location row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {userLocation?.state || "Nigeria"}
                </span>
              </div>

              {/* Category pills — dynamic from DB (Feature 5) */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 2 }}>
                {dynamicCats.map(c => (
                  <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, border: "none", background: activeCat === c ? "#fff" : "rgba(255,255,255,0.18)", color: activeCat === c ? PRIMARY : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "background 0.2s" }}>
                    <span style={{ fontSize: 13 }}>{getCatIcon(c)}</span>{c}
                  </button>
                ))}
              </div>
            </div>

            {storyGroups.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: DARK }}>Live Now</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0" }}>{storyGroups.length} active</span>
                </div>
                <div className="story-row">{storyGroups.map(g => <div key={g.restaurant.id} className="story-ring-wrap"><StoryRing group={g} onClick={() => setActiveStoryGroup(g)} /></div>)}</div>
              </>
            )}


            {(() => { const f = restaurants.find(r => r.is_open && r.badge); if (!f) return null; return (
              <div onClick={() => goDetail(f.id)} style={{ margin: "18px 20px 0", borderRadius: 20, background: `linear-gradient(135deg, ${f.bg_from}, ${f.bg_to})`, padding: "20px", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 64, opacity: 0.3 }}>{f.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Featured</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10, maxWidth: "70%" }}>{f.name}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 20 }}>{f.badge}</span>
              </div>
            ); })()}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: DARK }}>Open Now</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>{openNow.length} spots</span>
            </div>
            {restLoading
              ? <div className="hscroll">{[1,2,3].map(i => <HCardSkeleton key={i} />)}</div>
              : <div className="marquee-outer">
                  <div className="marquee-track">
                    {openNow.map(r => <HCard key={r.id + "-a"} r={r} onClick={() => goDetail(r.id)} />)}
                    {openNow.map(r => <HCard key={r.id + "-b"} r={r} onClick={() => goDetail(r.id)} />)}
                  </div>
                </div>
            }

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: DARK }}>{activeCat === "All" ? "All Restaurants" : activeCat}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>{filtered.length} total</span>
            </div>
            <div className="vlist">
              {restLoading
                ? [1,2,3].map(i => <VCardSkeleton key={i} />)
                : filtered.length === 0
                  ? <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6 }}>Nothing found</div>
                      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 14 }}>Check back later or browse all restaurants</div>
                      <button onClick={() => setActiveCat("All")} style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, background: BG_SOFT, border: "none", borderRadius: 20, padding: "8px 18px", cursor: "pointer" }}>Browse All</button>
                    </div>
                  : filtered.map(r => <VCard key={r.id} r={r} onClick={() => goDetail(r.id)} />)
              }
            </div>
            <div style={{ height: 12 }} />
          </>
        )}

        {/* ══════════ SEARCH ══════════ */}
        {tab === "search" && (
          <>
            {/* Header */}
            <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 16px", borderBottom: "1px solid #F0EDE8", position: "sticky", top: 0, zIndex: 50 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button onClick={() => { setTab("home"); clearSearchFilters(); }} style={{ width: 36, height: 36, borderRadius: "50%", background: BG, border: "none", fontSize: 18, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: BG, border: "1.5px solid #EBEBEB", borderRadius: 14, padding: "11px 14px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#C0C0C0" strokeWidth="2"/><path d="M21 21l-3.5-3.5" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round"/></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurants or dishes..." autoFocus style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: DARK, fontWeight: 500 }} />
                  {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", color: "#C0C0C0", fontSize: 14, fontWeight: 700 }}>✕</span>}
                </div>
                <HeaderCartBtnLight count={cart.totalItems} onClick={() => setTab("cart")} />
              </div>

              {/* Filters row: Open Now toggle + Min Rating */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <button
                  onClick={() => setSearchOpenOnly(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${searchOpenOnly ? "#16A34A" : "#EBEBEB"}`, background: searchOpenOnly ? "#F0FDF4" : "#fff", color: searchOpenOnly ? "#16A34A" : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <span style={{ fontSize: 8, color: searchOpenOnly ? "#22C55E" : "#D4CEC8" }}>●</span> Open Now
                </button>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setSearchMinRating(searchMinRating === star ? 0 : star)}
                      style={{ fontSize: 18, background: "transparent", border: "none", cursor: "pointer", padding: "2px", opacity: star <= searchMinRating ? 1 : 0.3, lineHeight: 1 }}>
                      ⭐
                    </button>
                  ))}
                  {searchMinRating > 0 && <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{searchMinRating}+</span>}
                </div>
                {(searchActiveCats.size > 0 || searchOpenOnly || searchMinRating > 0 || search) && (
                  <button onClick={clearSearchFilters} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: PRIMARY, background: BG_SOFT, border: "none", borderRadius: 20, padding: "6px 12px", cursor: "pointer" }}>
                    Clear all
                  </button>
                )}
              </div>

              {/* Category pills — multi-select, dynamic from DB */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
                {dynamicCats.filter(c => c !== "All").map(c => {
                  const active = searchActiveCats.has(c);
                  return (
                    <button key={c} onClick={() => toggleSearchCat(c)}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 20, border: `1.5px solid ${active ? PRIMARY : "#EBEBEB"}`, background: active ? BG_SOFT : "#fff", color: active ? PRIMARY : "#555", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                      <span>{getCatIcon(c)}</span>{c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results */}
            <div style={{ padding: "12px 20px 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0" }}>
                {searchFiltered.length} restaurant{searchFiltered.length !== 1 ? "s" : ""}
                {searchMenuItems.length > 0 && ` · ${searchMenuItems.length} dish${searchMenuItems.length !== 1 ? "es" : ""}`}
              </span>
            </div>

            <div className="vlist">
              {/* Matched menu items section */}
              {searchMenuItems.length > 0 && search.trim() && (
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px" }}>Matching Dishes</div>
                  {searchMenuItems.map(({ item, restaurant }) => (
                    <div key={item.id} onClick={() => goDetail(restaurant.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid #F7F5F2", cursor: "pointer" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: item.image_url ? "transparent" : `linear-gradient(135deg, ${restaurant.bg_from}, ${restaurant.bg_to})`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : restaurant.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>at {restaurant.name} · <span style={{ color: PRIMARY, fontWeight: 700 }}>₦{Number(item.price).toLocaleString()}</span></div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                  ))}
                </div>
              )}

              {/* Restaurant results */}
              {searchFiltered.length === 0 && !restLoading
                ? <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 }}>No results found</div>
                    <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 16 }}>No restaurants or dishes found. Try a different search.</div>
                    <button onClick={clearSearchFilters} style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, background: BG_SOFT, border: "none", borderRadius: 20, padding: "8px 18px", cursor: "pointer" }}>Clear filters</button>
                  </div>
                : searchFiltered.map(r => <VCard key={r.id} r={r} onClick={() => goDetail(r.id)} />)
              }
            </div>
          </>
        )}

        {/* ══════════ FEED (TikTok-style) ══════════ */}
        {tab === "feed" && (
          <FeedScreen
            posts={posts}
            likedIds={likedIds}
            loading={feedLoading}
            error={feedError}
            loadingMore={loadingMore}
            hasMore={hasMore}
            toggleLike={toggleLike}
            fetchMore={fetchMore}
            fetchComments={fetchComments}
            addComment={addComment}
            user={user}
            onLogin={() => setAuthMode("login")}
            onNavigateToRestaurant={(id) => { if (id) { goDetail(id); } }}
            onOrder={(restaurant) => {
              if (!restaurant) return;
              goDetail(restaurant.id);
            }}
          />
        )}

        {/* ══════════ DETAIL ══════════ */}
        {tab === "detail" && selected && (
          <>
            <div style={{ width: "100%", height: 240, background: `linear-gradient(155deg, ${selected.bg_from}, ${selected.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative", overflow: "hidden" }}>
              {/* Banner hero image */}
              {selected.banner_url && <img src={selected.banner_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />}
              {/* Gradient overlay when banner is present so text stays readable */}
              {selected.banner_url && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.4))" }} />}
              <button onClick={() => setTab("home")} style={{ position: "absolute", top: "max(env(safe-area-inset-top), 48px)", left: 16, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700, zIndex: 2 }}>←</button>
              <div style={{ position: "absolute", top: "max(env(safe-area-inset-top), 48px)", right: 16, zIndex: 2 }}>
                <HeaderCartBtn count={cart.totalItems} onClick={() => setTab("cart")} />
              </div>
              {(() => {
                const sg = storyGroups.find(g => g.restaurant.id === selected.id);
                const ringStyle = sg ? { outline: `3px solid ${PRIMARY}`, outlineOffset: 3, cursor: "pointer" } : { cursor: "default" };
                return selected.logo_url
                  ? <img src={selected.logo_url} alt={selected.name} onClick={sg ? () => setActiveStoryGroup(sg) : undefined}
                      style={{ position: "relative", zIndex: 2, width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255,255,255,0.35)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", ...ringStyle }} />
                  : <span onClick={sg ? () => setActiveStoryGroup(sg) : undefined}
                      style={{ position: "relative", zIndex: 2, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))", fontSize: 80, borderRadius: "50%", padding: sg ? 4 : 0, ...ringStyle }}>
                      {selected.icon}
                    </span>;
              })()}
            </div>

            <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", marginTop: -28, padding: "24px 20px 0", position: "relative", zIndex: 2, minHeight: "calc(100vh - 212px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ background: selected.badge ? BG_SOFT : BG, color: selected.badge ? PRIMARY : "#888", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>{selected.badge || (Array.isArray(selected.category) ? selected.category[0] : selected.category)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: selected.is_open ? "#F0FDF4" : "#FEF2F2", color: selected.is_open ? "#16A34A" : "#DC2626" }}>
                  <span style={{ fontSize: 7 }}>●</span>{selected.is_open ? "Open Now" : "Closed"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: DARK, lineHeight: 1.2 }}>{selected.name}</span>
                {selected.verified && <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#F0FDF4", padding: "3px 10px", borderRadius: 12, border: "1px solid #BBF7D0", flexShrink: 0 }}>✓ Verified</span>}
                {!selected.verified && selected.created_at && (Date.now() - new Date(selected.created_at) < 30 * 24 * 3600000) && <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "3px 10px", borderRadius: 12, flexShrink: 0 }}>New</span>}
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 10 }}>{selected.description}</div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>📍 {selected.address}</div>
              {(() => { const info = getHoursInfo(selected); return info ? <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10 }}>🕐 {info}</div> : <div style={{ marginBottom: 0 }} />; })()}

              {/* Loyalty points balance for this restaurant */}
              {user && !isOwnRestaurant && <LoyaltyBadge userId={user.id} restaurantId={selected.id} />}

              {/* Action buttons */}
              {isOwnRestaurant && (
                <div style={{ background: BG_SOFT, border: "1px solid #FFD0C0", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: PRIMARY, fontWeight: 700, marginBottom: 20 }}>
                  🏪 This is your restaurant — manage it from the Store tab
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {!isOwnRestaurant && (
                  <button onClick={() => setShowReservation(selected)}
                    style={{ flex: 1, padding: "12px", background: BG_SOFT, color: PRIMARY, border: `1.5px solid ${BORDER}`, borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    📅 Reserve a table
                  </button>
                )}
                <button onClick={() => user ? setActiveChat(selected) : setAuthMode("login")}
                  style={{ flex: isOwnRestaurant ? 1 : undefined, padding: "12px 16px", background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #BFDBFE", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  💬 Chat
                </button>
                {!isOwnRestaurant && cart.restaurantId === selected.id && cart.totalItems > 0 && (
                  <button onClick={() => setTab("cart")}
                    style={{ padding: "12px 16px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    🛒 {cart.totalItems}
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1.5px solid #F5F5F5", marginBottom: 20 }}>
                {["menu", "updates", "info"].map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 12, fontWeight: 700, color: detailTab === t ? PRIMARY : "#C0C0C0", border: "none", background: "transparent", borderBottom: `2px solid ${detailTab === t ? PRIMARY : "transparent"}`, marginBottom: -1.5, cursor: "pointer" }}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* ── MENU TAB with Add to Cart ── */}
              {detailTab === "menu" && (
                <>
                  {!selected.is_open && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 16 }}>Currently closed — menu shown for reference</div>}
                  {detailMenuLoading && <div style={{ textAlign: "center", padding: "28px 0", color: "#B0B0B0", fontSize: 13 }}>Loading menu...</div>}
                  {!detailMenuLoading && detailMenu.length === 0 && <div style={{ textAlign: "center", padding: "28px 0", color: "#B0B0B0", fontSize: 13 }}>No menu items yet</div>}
                  {detailMenu.map(cat => (
                    <div key={cat.id} style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#C0C0C0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F5F5F5" }}>{cat.name}</div>
                      {(cat.menu_items || []).map(item => {
                        const qty = cart.getQuantity(item.id);
                        return (
                          <div key={item.id} style={{ borderBottom: "1px solid #F5F5F5", paddingBottom: 14, marginBottom: 2, position: "relative" }}>
                            {/* Heart / favorite toggle */}
                            {user && !isOwnRestaurant && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
                                style={{ position: "absolute", top: 14, right: 0, width: 30, height: 30, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={favorites.has(item.id) ? PRIMARY : "none"} stroke={favorites.has(item.id) ? PRIMARY : "#C8C8C8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              </button>
                            )}
                            <div
                              style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingTop: 14, cursor: item.is_available ? "pointer" : "default" }}
                              onClick={() => item.is_available && !isOwnRestaurant && setSelectedMenuItem(item)}
                            >
                              {/* Food image */}
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name}
                                  style={{ width: 76, height: 76, borderRadius: 14, objectFit: "cover", flexShrink: 0, opacity: item.is_available ? 1 : 0.45 }} />
                              ) : (
                                <div style={{ width: 76, height: 76, borderRadius: 14, background: "#F7F5F2", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: item.is_available ? 1 : 0.45 }}>
                                  {selected.icon}
                                </div>
                              )}
                              {/* Info + controls */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: item.is_available ? DARK : "#D4CEC8", marginBottom: 3, lineHeight: 1.3 }}>{item.name}</div>
                                {!item.is_available && <div style={{ fontSize: 10, color: "#D4CEC8", marginBottom: 4 }}>Not available today</div>}
                                <div style={{ fontSize: 14, fontWeight: 800, color: item.is_available ? PRIMARY : "#EBEBEB", marginBottom: item.review_count > 0 ? 4 : 8 }}>₦{Number(item.price).toLocaleString()}</div>
                                {item.review_count > 0 && (
                                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, marginBottom: 8 }}>
                                    ⭐ {Number(item.avg_rating).toFixed(1)} ({item.review_count})
                                  </div>
                                )}
                                {!isOwnRestaurant && item.is_available && selected.is_open && (
                                  qty === 0 ? (
                                    /* "+" quick-add — stops propagation so it doesn't open the sheet */
                                    <button onClick={e => { e.stopPropagation(); handleAddToCart(item, selected); }}
                                      style={{ display: "flex", alignItems: "center", gap: 5, background: PRIMARY, border: "none", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", borderRadius: 10, padding: "7px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      + Add to cart
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
                                      <button onClick={() => cart.removeItem(item.id)} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #EBEBEB", background: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                      <span style={{ fontSize: 15, fontWeight: 800, color: DARK, minWidth: 18, textAlign: "center" }}>{qty}</span>
                                      <button onClick={() => handleAddToCart(item, selected)} style={{ width: 30, height: 30, borderRadius: 8, background: PRIMARY, border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Floating cart bar */}
                  {!isOwnRestaurant && cart.restaurantId === selected.id && cart.totalItems > 0 && (
                    <div className="cart-bar" style={{ position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 390, background: PRIMARY, borderRadius: 999, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", zIndex: 50, boxShadow: "0 4px 20px rgba(139,26,26,0.4)" }}
                      onClick={() => setTab("cart")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 8px", fontSize: 12, fontWeight: 800, color: "#fff" }}>{cart.totalItems}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>View Cart</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>₦{Number(cart.subtotal).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ height: 80 }} />
                </>
              )}

              {/* Updates tab */}
              {detailTab === "updates" && (() => {
                const rPosts = posts.filter(p => p.restaurant_id === selected.id || p.restaurants?.id === selected.id);
                return rPosts.length === 0
                  ? <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 32, marginBottom: 10 }}>📭</div><div style={{ fontSize: 14, color: "#B0B0B0", fontWeight: 600 }}>No updates yet</div></div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{rPosts.map(p => { const pt = getPostType(p.post_type); const liked = likedIds.has(p.id); return (
                    <div key={p.id} style={{ background: BG, borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ height: 3, background: pt.color }} />
                      <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: pt.bg, color: pt.color }}>{pt.icon} {pt.label}</span><span style={{ fontSize: 10, color: "#B0B0B0" }}>{timeAgo(p.created_at)}</span></div>
                        <div style={{ fontSize: 14, color: "#2D2D2D", lineHeight: 1.6, marginBottom: 10 }}>{p.text}</div>
                        <button onClick={() => user ? toggleLike(p.id) : setAuthMode("login")} style={{ display: "flex", alignItems: "center", gap: 6, background: liked ? BG_SOFT : "transparent", border: "none", borderRadius: 20, padding: "5px 10px", cursor: "pointer" }}>
                          <span style={{ fontSize: 13 }}>{liked ? "❤️" : "🤍"}</span><span style={{ fontSize: 12, fontWeight: 700, color: liked ? PRIMARY : "#B0B0B0" }}>{p.like_count}</span>
                        </button>
                      </div>
                    </div>
                  ); })}</div>;
              })()}

              {detailTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { ico: "📍", label: "Location", val: selected.address },
                    { ico: "🟢", label: "Status", val: selected.is_open ? "Open Now" : "Closed", color: selected.is_open ? "#16A34A" : "#DC2626" },
                    { ico: "🚚", label: "Delivery", val: "Contact restaurant directly" },
                    { ico: "🍽️", label: "Cuisine", val: Array.isArray(selected.category) ? selected.category.join(", ") : selected.category },
                  ].map(chip => (
                    <div key={chip.label} style={{ background: BG, borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{chip.ico}</div>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 2 }}>{chip.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: chip.color || DARK }}>{chip.val}</div>
                    </div>
                  ))}
                  {/* Opening hours from schedule */}
                  {selected.opening_hours && (() => {
                    const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
                    const DAY_LABELS = { monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun" };
                    return (
                      <div style={{ background: BG, borderRadius: 14, padding: 14 }}>
                        <div style={{ fontSize: 18, marginBottom: 8 }}>🕐</div>
                        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 10 }}>OPENING HOURS</div>
                        {DAYS.map(day => {
                          const dh = selected.opening_hours[day];
                          return (
                            <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #EBEBEB" }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: dh?.enabled ? DARK : "#C0C0C0" }}>{DAY_LABELS[day]}</span>
                              <span style={{ fontSize: 12, color: dh?.enabled ? "#555" : "#C0C0C0" }}>
                                {dh?.enabled ? `${fmt12(dh.open)} – ${fmt12(dh.close)}` : "Closed"}
                              </span>
                            </div>
                          );
                        })}
                        {(() => { const info = getHoursInfo(selected); return info ? <div style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, marginTop: 10 }}>🕐 {info}</div> : null; })()}
                      </div>
                    );
                  })()}
                  <button onClick={() => setShowReservation(selected)} style={{ width: "100%", padding: "14px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>📅 Reserve a Table</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ MY STORE (DASHBOARD) ══════════ */}
        {tab === "store" && !user && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Restaurant owners</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>Sign in to manage your store, menu, and post live updates to customers.</div>
            <button onClick={() => setAuthMode("login")} style={{ background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Sign In / Sign Up</button>
          </div>
        )}

        {tab === "store" && user && isAdmin && (
          <AdminPanel />
        )}

        {tab === "store" && user && !isOwner && !isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🙋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Not an owner account</div>
            <div style={{ fontSize: 14, color: "#888" }}>Contact the Chowli team to register your restaurant.</div>
          </div>
        )}

        {tab === "store" && user && isOwner && !ownerR && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
            {restLoading
              ? <div style={{ fontSize: 14, color: "#B0B0B0", fontWeight: 600 }}>Loading your store...</div>
              : <>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>No restaurant linked</div>
                  <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 16 }}>
                    Your account is set as an owner but no restaurant is linked to it yet.
                  </div>
                  {application && (
                    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14, padding: "14px 18px", fontSize: 13, color: "#92400E", lineHeight: 1.6, marginBottom: 20, width: "100%", textAlign: "left" }}>
                      <strong>Application status:</strong>{" "}
                      <span style={{ textTransform: "capitalize" }}>{application.status}</span><br />
                      {application.status === "pending" && "Under review — we'll notify you once approved."}
                      {application.status === "rejected" && (application.admin_note ? `Declined: ${application.admin_note}` : "Application was declined.")}
                      {application.status === "approved" && "Approved! Your store should appear shortly. Try refreshing."}
                    </div>
                  )}
                  <button onClick={() => setShowRegister(true)}
                    style={{ background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    Register a Restaurant
                  </button>
                </>
            }
          </div>
        )}

        {tab === "store" && user && isOwner && ownerR && (
          <>
            {/* ── Compact store hero header ── */}
            <div style={{ background: `linear-gradient(135deg, ${ownerR.bg_from || PRIMARY}, ${ownerR.bg_to || "#FF8C6B"})`, padding: "max(env(safe-area-inset-top), 52px) 20px 20px", position: "relative", overflow: "hidden" }}>
              {ownerR.banner_url && <img src={ownerR.banner_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />}
              {ownerR.banner_url && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.45))" }} />}
              <div style={{ position: "absolute", top: -20, right: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
              {/* Change cover button */}
              <button onClick={() => document.getElementById("banner-file-input")?.click()} style={{ position: "absolute", top: "max(env(safe-area-inset-top), 52px)", right: 20, zIndex: 2, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                🖼️ Cover
              </button>
              <BannerFileInput uploadBanner={uploadBanner} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
                {/* Restaurant photo — tappable to change */}
                <div style={{ position: "relative", flexShrink: 0 }} onClick={() => document.getElementById("logo-file-input")?.click()}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2.5px solid rgba(255,255,255,0.5)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, cursor: "pointer" }}>
                    {ownerR.logo_url
                      ? <img src={ownerR.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : ownerR.icon}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✏️</div>
                  <LogoFileInput ownerR={ownerR} uploadLogo={uploadLogo} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>{ownerR.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>Manage your presence on Chowli</div>
                </div>
                {/* Analytics button */}
                <button onClick={() => setShowAnalytics(true)}
                  style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  📊
                </button>

                {/* Messages button */}
                <button onClick={() => setShowOwnerChats(true)}
                  style={{ position: "relative", width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  💬
                  {ownerUnread > 0 && <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#DC2626", border: "2px solid #fff", fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{ownerUnread > 9 ? "9+" : ownerUnread}</div>}
                </button>

                {/* Open/closed toggle inline */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Toggle checked={ownerR.is_open} onChange={() => toggleOpen(ownerR.is_open)} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: ownerR.is_open ? "#fff" : "rgba(255,255,255,0.6)" }}>{ownerR.is_open ? "Open" : "Closed"}</span>
                </div>
              </div>
              {restaurants.filter(r => r.owner_id === user.id).length > 1 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginTop: 14, position: "relative", zIndex: 1 }}>
                  {restaurants.filter(r => r.owner_id === user.id).map(r => (
                    <button key={r.id} onClick={() => setOwnerRId(r.id)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1.5px solid", borderColor: (ownerRId || ownerR.id) === r.id ? "#fff" : "rgba(255,255,255,0.3)", background: (ownerRId || ownerR.id) === r.id ? "#fff" : "rgba(255,255,255,0.15)", color: (ownerRId || ownerR.id) === r.id ? PRIMARY : "#fff", whiteSpace: "nowrap" }}>{r.icon} {r.name.split(" ")[0]}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 20px" }}>

              {/* Stats */}
              {(() => { const all = ownerMenu.flatMap(c => c.menu_items || []); return (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {[{ n: all.length, l: "Items" }, { n: all.filter(i => i.is_available).length, l: "Avail" }, { n: incomingOrders.length, l: "Orders" }, { n: loyaltyMembersCount, l: "Loyal" }, { n: posts.filter(p => p.restaurant_id === ownerR.id).length, l: "Posts" }].map(s => (
                    <div key={s.l} style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "12px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: PRIMARY }}>{s.n}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              ); })()}

              {/* ── Payment method settings ── */}
              <PaymentSettingsCard ownerR={ownerR} togglePaymentMethod={togglePaymentMethod} />

              {/* ── Payout account ── */}
              <PayoutAccountCard ownerR={ownerR} />

              {/* ── Restaurant location ── */}
              <LocationCard ownerR={ownerR} />

              {/* ── Incoming orders ── */}
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Incoming Orders</div>
                {incomingOrders.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "20px 16px", textAlign: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>No new orders</div>
                    <div style={{ fontSize: 12, color: "#888" }}>You're all caught up!</div>
                  </div>
                )}
              </>
              {incomingOrders.length > 0 && (
                <>
                  {incomingOrders.map(order => {
                    const sc = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                    return (
                      <div key={order.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 16px", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 4 }}>{order.profiles?.full_name || "Customer"}</div>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{order.fulfillment === "delivery" ? "🛵 Delivery" : "🏃 Pickup"} · {order.payment_method === "cash" ? "💵 Cash" : "💳 Online"}</div>
                        {order.scheduled_time && (() => {
                          const d = new Date(order.scheduled_time);
                          const now = new Date();
                          const isToday = d.toDateString() === now.toDateString();
                          const tom = new Date(now); tom.setDate(now.getDate() + 1);
                          const dayLabel = isToday ? "Today" : d.toDateString() === tom.toDateString() ? "Tomorrow" : d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" });
                          const timeLabel = fmt12(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
                          return (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "4px 10px", borderRadius: 20, display: "inline-block", marginBottom: 8 }}>
                              ⏰ Scheduled · {dayLabel} at {timeLabel}
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{(order.order_items || []).map(i => `${i.name} x${i.quantity}`).join(", ")}</div>
                        {order.status === "ready" && order.fulfillment === "delivery" && !deliveryPhotos[order.id] && (
                          <DeliveryPhotoUpload
                            orderId={order.id}
                            restaurantId={ownerR.id}
                            onUploaded={() => setDeliveryPhotos(prev => ({ ...prev, [order.id]: true }))}
                          />
                        )}
                        {order.status === "ready" && order.fulfillment !== "delivery" && !deliveryPhotos[order.id] && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4 }}>
                              📸 Handover photo <span style={{ fontWeight: 400 }}>(optional)</span>
                            </div>
                            <DeliveryPhotoUpload
                              orderId={order.id}
                              restaurantId={ownerR.id}
                              onUploaded={() => setDeliveryPhotos(prev => ({ ...prev, [order.id]: true }))}
                              hideLabel
                            />
                            <button
                              onClick={() => setDeliveryPhotos(prev => ({ ...prev, [order.id]: "skipped" }))}
                              style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                              Skip — no photo needed
                            </button>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>₦{Number(order.subtotal).toLocaleString()}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            {order.status === "pending" && <button onClick={() => updateStatus(order.id, "confirmed")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Confirm</button>}
                            {order.status === "confirmed" && <button onClick={() => updateStatus(order.id, "preparing")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: BG_SOFT, color: PRIMARY, cursor: "pointer" }}>Preparing</button>}
                            {order.status === "preparing" && <button onClick={() => updateStatus(order.id, "ready")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Ready</button>}
                            {order.status === "ready" && order.fulfillment !== "delivery" && <button onClick={() => updateStatus(order.id, "delivered")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Mark Handed Over</button>}
                            {order.status === "ready" && order.fulfillment === "delivery" && (
                              deliveryPhotos[order.id]
                                ? <button onClick={() => updateStatus(order.id, "delivered")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Mark Delivered</button>
                                : null
                            )}
                            {!["completed","delivered","cancelled"].includes(order.status) && <button onClick={() => updateStatus(order.id, "cancelled")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, border: "none", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>Cancel</button>}
                          </div>
                        </div>
                        {order.note && <div style={{ marginTop: 8, fontSize: 11, color: "#888", background: BG, borderRadius: 8, padding: "6px 10px" }}>Note: {order.note}</div>}
                      </div>
                    );
                  })}
                  <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 16px" }} />
                </>
              )}

              {/* ── Incoming reservations ── */}
              <ReservationManagement restaurantId={ownerR.id} />

              {/* ── Opening hours ── */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Store Hours</div>
              <OpeningHoursCard ownerR={ownerR} updateOpeningHours={updateOpeningHours} />

              {/* Feed media post */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Feed Post</div>
              <PostMediaCard ownerR={ownerR} uploadPostMedia={uploadPostMedia} createPost={createPost} />

              {/* Stories */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Live Story</div>
              <StoryUploadCard restaurantId={ownerR.id} restaurant={ownerR} />

              {/* Post composer */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Text Update</div>
              {!composing ? (
                <div onClick={() => setComposing(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px dashed #EBEBEB", borderRadius: 16, padding: "14px 16px", cursor: "pointer", marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${ownerR.bg_from}, ${ownerR.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{ownerR.icon}</div>
                  <span style={{ fontSize: 13, color: "#C0C0C0", fontWeight: 500 }}>Share a new item, promo, or update...</span>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>New Post</div>
                    <button onClick={() => { setComposing(false); setPostText(""); }} style={{ fontSize: 20, cursor: "pointer", color: "#C0C0C0", background: "transparent", border: "none" }}>×</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
                    {POST_TYPES.map(pt => <button key={pt.id} onClick={() => setPostType(pt.id)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 20, cursor: "pointer", border: `1.5px solid ${postType === pt.id ? pt.color : "#EBEBEB"}`, background: postType === pt.id ? pt.bg : "transparent", color: postType === pt.id ? pt.color : "#888" }}>{pt.icon} {pt.label}</button>)}
                  </div>
                  <textarea value={postText} onChange={e => setPostText(e.target.value.slice(0, 200))} placeholder={postType === "new" ? "Tell customers about your new item..." : postType === "promo" ? "Describe your offer or discount..." : postType === "sold_out" ? "Let customers know what's sold out today..." : "Share any update with your customers..."} style={{ width: "100%", border: "none", background: BG, outline: "none", fontSize: 14, color: DARK, fontWeight: 500, resize: "none", padding: "14px 16px", lineHeight: 1.6, minHeight: 90 }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #F5F5F5" }}>
                    <span style={{ fontSize: 11, color: "#C0C0C0" }}>{postText.length}/200</span>
                    <button disabled={!postText.trim() || saving} onClick={submitPost} style={{ background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 22px", borderRadius: 999, border: "none", cursor: "pointer", opacity: (!postText.trim() || saving) ? 0.4 : 1 }}>{saving ? "Posting..." : "Post Update"}</button>
                  </div>
                </div>
              )}

              {/* ── Promo Codes ── */}
              <PromoCodesCard restaurantId={ownerR.id} />

              <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 16px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1 }}>Menu</div>
                <button onClick={() => setShowAddItem(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: PRIMARY, border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  + Add Item
                </button>
              </div>
              {ownerMenuLoading && <div style={{ textAlign: "center", padding: "16px 0", color: "#B0B0B0", fontSize: 13 }}>Loading menu...</div>}
              {!ownerMenuLoading && ownerMenu.flatMap(c => c.menu_items || []).length === 0 && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "24px 16px", textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>No menu items yet</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Tap + Add Item to get started</div>
                </div>
              )}
              {ownerMenu.map(cat => (
                <div key={cat.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F0EDE8", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#888", padding: "8px 0" }}>{cat.name}</div>
                    <button onClick={async () => {
                      if (!window.confirm(`Delete "${cat.name}" and all its items?`)) return;
                      await supabase.from("menu_categories").delete().eq("id", cat.id);
                      refetchOwnerMenu();
                    }} style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Delete</button>
                  </div>
                  {(cat.menu_items || []).map(item => (
                    <DashMenuItem
                      key={item.id}
                      item={item}
                      restaurantId={ownerR.id}
                      onToggle={async () => {
                        // 1. Optimistic update — flip immediately in local state
                        setOwnerMenu(prev => prev.map(c => ({
                          ...c,
                          menu_items: (c.menu_items || []).map(i =>
                            i.id === item.id ? { ...i, is_available: !i.is_available } : i
                          ),
                        })));
                        // 2. Persist to DB
                        await toggleItem(item.id, item.is_available);
                        // 3. Sync to confirm actual DB state
                        refetchOwnerMenu();
                      }}
                      onDelete={async () => {
                        if (!window.confirm("Delete " + item.name + "?")) return;
                        await supabase.from("menu_items").delete().eq("id", item.id);
                        refetchOwnerMenu();
                      }}
                      onImageUploaded={async (file) => {
                        const { url, error } = await uploadFoodImage(file, ownerR.id, item.id);
                        if (!error && url) await updateItemImage(item.id, url);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════ FAVORITES ══════════ */}
        {tab === "favorites" && (
          <FavoritesScreen
            user={user}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            restaurants={restaurants}
            cart={cart}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* ══════════ ORDERS ══════════ */}
        {tab === "orders" && (
          user
            ? <OrdersPage user={user} onBrowse={() => setTab("home")} onReview={(order) => setReviewTarget(order)} reviewedOrderIds={reviewedOrderIds} onReorder={handleReorder} />
            : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🧾</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1C1C1E", marginBottom: 8 }}>Sign in to see your orders</div>
                <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>Your order history will appear here once you sign in.</div>
                <button onClick={() => setAuthMode("login")} style={{ background: PRIMARY, color: "#fff", border: "none", borderRadius: 999, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sign In</button>
              </div>
            )
        )}

        {tab !== "cart" && <BottomNav tab={tab} setTab={handleTabChange} isOwner={isOwner} />}
      </div>
    </>
  );
}

// ── Loyalty badge on restaurant detail page ──────────────────
function LoyaltyBadge({ userId, restaurantId }) {
  const [pts, setPts] = useState(null);
  useEffect(() => {
    supabase
      .from("loyalty_points")
      .select("points")
      .eq("customer_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle()
      .then(({ data }) => setPts(data?.points ?? 0));
  }, [userId, restaurantId]);

  if (pts === null || pts === 0) return <div style={{ marginBottom: 16 }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#EDE9FE", borderRadius: 12, padding: "8px 12px", marginBottom: 16 }}>
      <span style={{ fontSize: 16 }}>⭐</span>
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>You have {pts} points here</span>
        {pts >= 100
          ? <span style={{ fontSize: 11, color: "#7C3AED", marginLeft: 6 }}>· Redeem 100 pts for ₦500 off at checkout</span>
          : <span style={{ fontSize: 11, color: "#9C72CC", marginLeft: 6 }}>· {100 - pts} more to unlock ₦500 discount</span>}
      </div>
    </div>
  );
}

// ── Promo Codes section in owner dashboard ───────────────────
function PromoCodesCard({ restaurantId }) {
  const { codes, loading, fetchCodes, createCode, toggleCode } = usePromoCodes(restaurantId);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ code: "", discountType: "percent", discountValue: "", minOrder: "", maxUses: "", expiresAt: "" });
  const [formErr, setFormErr]   = useState("");

  useEffect(() => { fetchCodes(); }, [restaurantId]);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.discountValue) { setFormErr("Code and discount value are required"); return; }
    setCreating(true);
    const { error } = await createCode({
      code:          form.code,
      discountType:  form.discountType,
      discountValue: Number(form.discountValue),
      minOrder:      form.minOrder ? Number(form.minOrder) : 0,
      maxUses:       form.maxUses  ? Number(form.maxUses)  : null,
      expiresAt:     form.expiresAt || null,
    });
    setCreating(false);
    if (error) { setFormErr(error.message || "Failed to create code"); return; }
    setForm({ code: "", discountType: "percent", discountValue: "", minOrder: "", maxUses: "", expiresAt: "" });
    setFormErr("");
    setShowForm(false);
  };

  const inputStyle = { width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: DARK, background: BG, outline: "none", marginBottom: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box" };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1 }}>Promo Codes</div>
        <button onClick={() => { setShowForm(v => !v); setFormErr(""); }} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: PRIMARY, border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {showForm ? "Cancel" : "+ Create"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "16px", marginBottom: 12 }}>
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="Code name (e.g. SAVE20)" style={inputStyle} />
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[{ id: "percent", label: "% Off" }, { id: "fixed", label: "₦ Off" }].map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, discountType: t.id }))}
                style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${form.discountType === t.id ? PRIMARY : "#EBEBEB"}`, background: form.discountType === t.id ? BG_SOFT : "#fff", color: form.discountType === t.id ? PRIMARY : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>
          <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
            placeholder={form.discountType === "percent" ? "Discount % (e.g. 20)" : "Discount amount in ₦"} style={inputStyle} />
          <input type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
            placeholder="Min order ₦ (optional)" style={inputStyle} />
          <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
            placeholder="Max uses (leave blank = unlimited)" style={inputStyle} />
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4, marginTop: -4 }}>Expiry date (optional)</div>
          <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={{ ...inputStyle, marginBottom: 12, color: form.expiresAt ? DARK : "#B0B0B0" }} />
          {formErr && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10 }}>{formErr}</div>}
          <button onClick={handleCreate} disabled={creating} style={{ width: "100%", padding: "12px", background: PRIMARY, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: creating ? 0.6 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {creating ? "Creating..." : "Create Code"}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: "#C0C0C0", textAlign: "center", padding: "12px 0" }}>Loading codes...</div>
      ) : codes.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #F0EDE8", padding: "14px", textAlign: "center", fontSize: 12, color: "#C0C0C0", marginBottom: 4 }}>No promo codes yet</div>
      ) : codes.map(c => (
        <div key={c.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #F0EDE8", padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 2 }}>{c.code}</div>
            <div style={{ fontSize: 11, color: "#888" }}>
              {c.discount_type === "percent" ? `${c.discount_value}% off` : `₦${Number(c.discount_value).toLocaleString()} off`}
              {c.min_order > 0 && ` · Min ₦${Number(c.min_order).toLocaleString()}`}
              {c.max_uses ? ` · ${c.uses_count}/${c.max_uses} uses` : c.uses_count > 0 ? ` · ${c.uses_count} uses` : ""}
            </div>
          </div>
          <Toggle checked={c.is_active} onChange={() => toggleCode(c.id, c.is_active)} />
        </div>
      ))}
      <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 16px" }} />
    </div>
  );
}

// ── Reservation management section in dashboard ──────────────
function ReservationManagement({ restaurantId }) {
  const { reservations, loading, fetchReservations, respond } = useIncomingReservations(restaurantId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) { fetchReservations(); setLoaded(true); }
  }, [restaurantId]);

  if (loading) return null;
  if (!reservations.length) return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Reservations</div>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "16px", textAlign: "center", fontSize: 13, color: "#C0C0C0", marginBottom: 14 }}>No pending reservations</div>
    </>
  );

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Reservations</div>
      {reservations.map(res => {
        const sc = RES_STATUS[res.status] || RES_STATUS.pending;
        const dt = new Date(res.reserved_at);
        return (
          <div key={res.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{res.profiles?.full_name || "Guest"}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>📅 {dt.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })} at {dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: res.pre_order_note ? 8 : 4 }}>👥 {res.party_size} {res.party_size === 1 ? "person" : "people"}</div>
            {res.pre_order_note && <div style={{ fontSize: 11, color: "#888", background: "#F7F5F2", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>"{res.pre_order_note}"</div>}
            {res.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => respond(res.id, "confirmed", "")} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "8px", borderRadius: 10, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>✓ Confirm</button>
                <button onClick={() => respond(res.id, "rejected", "")} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "8px", borderRadius: 10, border: "none", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>✕ Decline</button>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 16px" }} />
    </>
  );
}
