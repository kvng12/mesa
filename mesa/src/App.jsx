// src/App.jsx — MESA with Cart, Checkout & Reservations

import React from "react";
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
import { useProfile }                         from "./hooks/useProfile";
import { useReviews }                         from "./hooks/useReviews";
import { useRegistration }                    from "./hooks/useRegistration";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`;

const POST_TYPES = [
  { id: "new",      label: "New Item", color: CORAL,     bg: "#FFF0ED", icon: "✨" },
  { id: "promo",    label: "Promo",    color: "#D97706", bg: "#FFFBEB", icon: "🎉" },
  { id: "update",   label: "Update",   color: "#2563EB", bg: "#EFF6FF", icon: "📢" },
  { id: "sold_out", label: "Sold Out", color: "#6B7280", bg: "#F3F4F6", icon: "😔" },
];

const CATS = ["All", "Nigerian", "Grills", "Chinese", "Snacks", "Fast Food"];
const CAT_ICONS = { All: "🍽️", Nigerian: "🍲", Grills: "🔥", Chinese: "🍜", Snacks: "🥐", "Fast Food": "🍔" };
const getPostType = id => POST_TYPES.find(t => t.id === id) || POST_TYPES[2];

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening";
}

// ── Status helpers ───────────────────────────────────────────
const ORDER_STATUS = { pending: { label: "Received", color: "#D97706", bg: "#FFFBEB" }, confirmed: { label: "Confirmed", color: "#2563EB", bg: "#EFF6FF" }, preparing: { label: "Preparing", color: CORAL, bg: "#FFF0ED" }, ready: { label: "Ready!", color: "#16A34A", bg: "#F0FDF4" }, completed: { label: "Completed", color: "#6B7280", bg: "#F3F4F6" }, cancelled: { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" } };
const RES_STATUS  = { pending: { label: "Pending", color: "#D97706", bg: "#FFFBEB" }, confirmed: { label: "Confirmed", color: "#16A34A", bg: "#F0FDF4" }, rejected: { label: "Declined", color: "#DC2626", bg: "#FEF2F2" }, completed: { label: "Done", color: "#6B7280", bg: "#F3F4F6" } };

// ════════════════════════════════════════════════════════════
//  UI COMPONENTS
// ════════════════════════════════════════════════════════════

function StoryRing({ group, onClick }) {
  const r = group.restaurant;
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
      <div style={{ width: 66, height: 66, borderRadius: "50%", padding: 2.5, background: group.hasUnviewed ? `linear-gradient(135deg, ${CORAL}, #FF8C6B)` : "rgba(0,0,0,0.08)" }}>
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
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
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
        {error && <div style={{ fontSize: 12, color: CORAL, fontWeight: 600, marginTop: 8 }}>{error}</div>}
        {done  && <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 8 }}>✓ Story live for 24 hours.</div>}
        {preview && <button disabled={uploading} onClick={submit} style={{ width: "100%", marginTop: 12, padding: "13px", background: CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: uploading ? 0.6 : 1 }}>{uploading ? "Uploading..." : "Post Story"}</button>}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: "relative", width: 52, height: 30, display: "inline-block", flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: 30, background: checked ? CORAL : "#E0E0E0", transition: "0.3s", cursor: "pointer" }}>
        <span style={{ position: "absolute", left: checked ? 25 : 3, top: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
      </span>
    </label>
  );
}

function VCard({ r, onClick }) {
  const all = (r.menu_categories || []).flatMap(c => c.menu_items || []);
  return (
    <div onClick={onClick} style={{ background: "#fff", borderRadius: 20, padding: 14, display: "flex", gap: 14, cursor: "pointer", border: "1px solid #F0EDE8", opacity: r.is_open ? 1 : 0.55 }}>
      <div style={{ width: 80, height: 80, borderRadius: 16, background: `linear-gradient(135deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>{r.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 4 }}>{r.name}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>{r.category}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ color: r.is_open ? "#22C55E" : "#D4CEC8", fontSize: 8 }}>●</span><span style={{ fontSize: 11, fontWeight: 700, color: r.is_open ? "#22C55E" : "#B0B0B0" }}>{r.is_open ? "Open" : "Closed"}</span></span>
        </div>
        <div style={{ fontSize: 12, color: "#B0B0B0", marginBottom: 8, lineHeight: 1.4 }}>{r.description}</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(r.tags || []).slice(0, 3).map(t => <span key={t} style={{ fontSize: 9, fontWeight: 700, color: "#888", background: BG, padding: "3px 8px", borderRadius: 10 }}>{t}</span>)}
          {r.is_open && all.filter(i => i.is_available).length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: CORAL, background: "#FFF0ED", padding: "3px 8px", borderRadius: 10 }}>{all.filter(i => i.is_available).length} available</span>}
        </div>
      </div>
    </div>
  );
}

function HCard({ r, onClick }) {
  return (
    <div onClick={onClick} style={{ flexShrink: 0, width: 190, background: "#fff", borderRadius: 20, overflow: "hidden", cursor: "pointer", border: "1px solid #F0EDE8" }}>
      <div style={{ width: "100%", height: 120, background: `linear-gradient(140deg, ${r.bg_from}, ${r.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, position: "relative" }}>
        {r.badge && <div style={{ position: "absolute", top: 10, left: 10, background: CORAL, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{r.badge}</div>}
        {r.is_open && <div style={{ position: "absolute", top: 10, right: 10, width: 9, height: 9, borderRadius: "50%", background: "#22C55E", border: "2px solid #fff" }} />}
        {r.icon}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
        <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 4 }}>{r.category}</div>
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
          <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 6, background: liked ? "#FFF0ED" : "transparent", border: "none", borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span style={{ fontSize: 14 }}>{liked ? "❤️" : "🤍"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: liked ? CORAL : "#B0B0B0" }}>{post.like_count}</span>
          </button>
          <button onClick={onViewRest} style={{ fontSize: 11, fontWeight: 700, color: CORAL, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>View Restaurant →</button>
        </div>
      </div>
    </div>
  );
}


// ── DashMenuItem — dashboard food item with image upload + big toggle ──
function DashMenuItem({ item, restaurantId, onToggle, onImageUploaded }) {
  const [uploading, setUploading] = React.useState(false);
  const [localUrl, setLocalUrl]   = React.useState(null);
  const fileRef                   = React.useRef();

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
          <div style={{ fontSize: 12, fontWeight: 800, color: item.is_available ? "#FF6240" : "#EDE9E4" }}>₦{Number(item.price).toLocaleString()}</div>
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

function BottomNav({ tab, setTab, cartCount }) {
  const items = [
    { id: "home",   label: "Home",   SVG: HomeSVG   },
    { id: "feed",   label: "Feed",   SVG: FeedSVG   },
    { id: "cart",   label: "Cart",   SVG: CartSVG,  badge: cartCount },
    { id: "store",  label: "Store",  SVG: StoreSVG  },
    { id: "orders", label: "Orders", SVG: OrdersSVG },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #F0EDE8", display: "flex", paddingTop: 10, paddingBottom: "calc(14px + env(safe-area-inset-bottom))", zIndex: 100 }}>
      {items.map(({ id, label, SVG, badge }) => {
        const active = tab === id || (tab === "detail" && id === "home");
        return (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", padding: "2px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}>
            <SVG active={active} />
            {badge > 0 && <div style={{ position: "absolute", top: -2, right: "18%", background: CORAL, color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>{badge > 9 ? "9+" : badge}</div>}
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? CORAL : "#B0B0B0" }}>{label}</span>
            {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: CORAL }} />}
          </button>
        );
      })}
    </nav>
  );
}

const HomeSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V12h6v9" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SearchSVG = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2"/><path d="M21 21l-3.5-3.5" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round"/></svg>;
const FeedSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2"/><path d="M6 1v3M10 1v3M14 1v3" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round"/></svg>;
const CartSVG   = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="21" r="1.5" fill={active ? CORAL : "#C0C0C0"}/><circle cx="19" cy="21" r="1.5" fill={active ? CORAL : "#C0C0C0"}/><path d="M2 3h2l2.68 10.39a2 2 0 0 0 1.94 1.61h9.72a2 2 0 0 0 1.94-1.51L22 7H6" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StoreSVG  = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l1-6h16l1 6" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2"/><path d="M5 21V9M19 9v12M5 21h14" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const OrdersSVG = ({ active }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2"/><path d="M9 12h6M9 16h4" stroke={active ? CORAL : "#C0C0C0"} strokeWidth="2" strokeLinecap="round"/></svg>;

// ════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const { user, profile, loading: authLoading, isOwner, isAdmin, signUp, signIn, signInWithMagicLink, signOut } = useAuth();
  const { restaurants, loading: restLoading } = useRestaurants();
  const { posts, likedIds, toggleLike }       = useFeed(user?.id);
  const { grouped: storyGroups, markViewed }  = useStories(user?.id);
  const cart                                  = useCart();
  const { makeReservation, submitting: resSub, error: resErr } = useReservations(user?.id);
  const { orders: customerOrders, refetch: refetchOrders } = useOrders(user?.id);
  const { reviewedOrderIds, submitReview }   = useReviews(user?.id);
  const { application, submitting: regSub, error: regErr, submitApplication } = useRegistration(user?.id);

  const [appState, setAppState]       = useState("splash");
  const [authMode, setAuthMode]       = useState(null);
  const [tab, setTab]                 = useState("home");
  const [selectedId, setSelectedId]   = useState(null);
  const [detailTab, setDetailTab]     = useState("menu");
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

  useEffect(() => {
    if (appState !== "splash") return;
    const timer = setTimeout(() => setAppState(localStorage.getItem("mesa_onboarded") ? "app" : "onboarding"), 1800);
    return () => clearTimeout(timer);
  }, [appState]);

  const selected  = restaurants.find(r => r.id === selectedId);
  const ownerR    = restaurants.find(r => r.id === ownerRId) || restaurants.find(r => r.owner_id === user?.id);
  const openCount = restaurants.filter(r => r.is_open).length;
  const { toggleOpen, toggleItem, updateItemImage, uploadFoodImage, createPost, saving } = useOwnerRestaurant(ownerR?.id);
  const { orders: incomingOrders, fetchOrders: fetchIncoming, updateStatus } = useIncomingOrders(ownerR?.id);

  const filtered = restaurants.filter(r => {
    const mc = activeCat === "All" || r.category === activeCat;
    const ms = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });
  const openNow = restaurants.filter(r => r.is_open).slice(0, 4);

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

  async function submitPost() {
    if (!postText.trim() || !ownerR) return;
    await createPost({ postType, text: postText.trim() });
    setPostText(""); setComposing(false);
  }

  // ── Splash ───────────────────────────────────────────────
  if (appState === "splash") return (
    <div style={{ position: "fixed", inset: 0, background: CORAL, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ width: 90, height: 90, background: "rgba(255,255,255,0.15)", borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 20 }}>🍽️</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: -1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>MESA</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your local food market</div>
    </div>
  );

  if (appState === "onboarding") return <Onboarding onDone={() => { localStorage.setItem("mesa_onboarded", "1"); setAppState("app"); }} />;

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

  if (authLoading || restLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: BG, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div><div style={{ fontSize: 14, color: "#888" }}>Loading MESA...</div></div>
    </div>
  );

  return (
    <>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${BG}; overscroll-behavior: none; }
        .mesa { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; max-width: 430px; margin: 0 auto; min-height: 100vh; background: ${BG}; padding-bottom: calc(80px + env(safe-area-inset-bottom)); overflow-x: hidden; -webkit-tap-highlight-color: transparent; }
        .hscroll { display: flex; gap: 14px; padding: 0 20px 4px; overflow-x: auto; scrollbar-width: none; }
        .hscroll::-webkit-scrollbar { display: none; }
        .vlist { display: flex; flex-direction: column; gap: 10px; padding: 0 20px; }
        .story-row { display: flex; gap: 14px; padding: 18px 20px 4px; overflow-x: auto; scrollbar-width: none; }
        .story-row::-webkit-scrollbar { display: none; }
        input, textarea, button { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="mesa">

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
              <button onClick={confirmClearAndAdd} style={{ width: "100%", padding: 14, background: CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>Clear & switch restaurant</button>
              <button onClick={() => setPendingItem(null)} style={{ width: "100%", padding: 14, background: BG, color: DARK, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Keep current cart</button>
            </div>
          </div>
        )}

        {/* ══════════ HOME ══════════ */}
        {tab === "home" && (
          <>
            <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 20px", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div onClick={() => user ? setShowProfile(true) : setAuthMode("login")} style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${CORAL}, #FF8C6B)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                    {user ? (profile?.full_name?.[0]?.toUpperCase() || "U") : "👤"}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{greet()},</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>{user ? `${profile?.full_name?.split(" ")[0] || "there"}! 👋` : "Guest 👋"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CORAL, background: "#FFF0ED", padding: "4px 10px", borderRadius: 20 }}>{openCount} open</div>
                  <button
                    onClick={() => setTab("search")}
                    style={{ width: 38, height: 38, borderRadius: "50%", background: BG, border: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    aria-label="Search"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="#888" strokeWidth="2"/>
                      <path d="M21 21l-3.5-3.5" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
                <span style={{ color: CORAL }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>Tambuwal, Sokoto</span>
                <span style={{ fontSize: 10, color: "#888" }}>▾</span>
              </div>

            </div>

            {storyGroups.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Live Now</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0" }}>{storyGroups.length} active</span>
                </div>
                <div className="story-row">{storyGroups.map(g => <StoryRing key={g.restaurant.id} group={g} onClick={() => setActiveStoryGroup(g)} />)}</div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, padding: "18px 20px 4px", overflowX: "auto", scrollbarWidth: "none" }}>
              {CATS.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: "none", background: activeCat === c ? CORAL : "#fff", color: activeCat === c ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer" }}><span style={{ fontSize: 14 }}>{CAT_ICONS[c]}</span>{c}</button>)}
            </div>

            {(() => { const f = restaurants.find(r => r.is_open && r.badge); if (!f) return null; return (
              <div onClick={() => goDetail(f.id)} style={{ margin: "18px 20px 0", borderRadius: 20, background: `linear-gradient(135deg, ${f.bg_from}, ${f.bg_to})`, padding: "20px", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 64, opacity: 0.3 }}>{f.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Featured</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10, maxWidth: "70%" }}>{f.name}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 20 }}>{f.badge}</span>
              </div>
            ); })()}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>Open Now</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>{openNow.length} spots</span>
            </div>
            <div className="hscroll">{openNow.map(r => <HCard key={r.id} r={r} onClick={() => goDetail(r.id)} />)}</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 12px" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>{activeCat === "All" ? "All Restaurants" : activeCat}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CORAL }}>{filtered.length} total</span>
            </div>
            <div className="vlist">
              {filtered.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div><div style={{ fontSize: 14, color: "#B0B0B0", fontWeight: 600 }}>Nothing found</div></div>
                : filtered.map(r => <VCard key={r.id} r={r} onClick={() => goDetail(r.id)} />)}
            </div>
            <div style={{ height: 12 }} />
          </>
        )}

        {/* ══════════ SEARCH ══════════ */}
        {tab === "search" && (
          <>
            <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 20px", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 14 }}>Find a Restaurant</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: BG, border: "1.5px solid #EBEBEB", borderRadius: 14, padding: "13px 16px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#C0C0C0" strokeWidth="2"/><path d="M21 21l-3.5-3.5" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or cuisine..." autoFocus style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: DARK, fontWeight: 500 }} />
                {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", color: "#C0C0C0", fontSize: 14, fontWeight: 700 }}>✕</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "14px 20px 4px", overflowX: "auto", scrollbarWidth: "none" }}>
              {CATS.map(c => <button key={c} onClick={() => setActiveCat(c)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: "none", background: activeCat === c ? CORAL : "#fff", color: activeCat === c ? "#fff" : "#555", fontWeight: 700, fontSize: 12, cursor: "pointer" }}><span style={{ fontSize: 14 }}>{CAT_ICONS[c]}</span>{c}</button>)}
            </div>
            <div style={{ padding: "10px 20px 4px", fontSize: 11, fontWeight: 700, color: "#B0B0B0" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
            <div className="vlist">{filtered.map(r => <VCard key={r.id} r={r} onClick={() => goDetail(r.id)} />)}</div>
          </>
        )}

        {/* ══════════ FEED ══════════ */}
        {tab === "feed" && (
          <>
            <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 18px", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 3 }}>What's Happening 🔥</div>
              <div style={{ fontSize: 12, color: "#888" }}>Live updates from restaurants near you</div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {posts.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0" }}><div style={{ fontSize: 32, marginBottom: 10 }}>📭</div><div style={{ fontSize: 14, color: "#B0B0B0", fontWeight: 600 }}>No updates yet</div></div>
                : posts.map(p => <PostCard key={p.id} post={p} liked={likedIds.has(p.id)} onLike={() => user ? toggleLike(p.id) : setAuthMode("login")} onViewRest={() => goDetail(p.restaurants?.id)} />)}
            </div>
          </>
        )}

        {/* ══════════ DETAIL ══════════ */}
        {tab === "detail" && selected && (
          <>
            <div style={{ width: "100%", height: 240, background: `linear-gradient(155deg, ${selected.bg_from}, ${selected.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative" }}>
              <button onClick={() => setTab("home")} style={{ position: "absolute", top: "max(env(safe-area-inset-top), 48px)", left: 16, width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700 }}>←</button>
              {(() => { const sg = storyGroups.find(g => g.restaurant.id === selected.id); return <span onClick={sg ? () => setActiveStoryGroup(sg) : undefined} style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.25))", cursor: sg ? "pointer" : "default", outline: sg ? `3px solid ${CORAL}` : "none", borderRadius: "50%", padding: sg ? 4 : 0 }}>{selected.icon}</span>; })()}
            </div>

            <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", marginTop: -28, padding: "24px 20px 0", position: "relative", zIndex: 2, minHeight: "calc(100vh - 212px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ background: selected.badge ? "#FFF0ED" : BG, color: selected.badge ? CORAL : "#888", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>{selected.badge || selected.category}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: selected.is_open ? "#F0FDF4" : "#FEF2F2", color: selected.is_open ? "#16A34A" : "#DC2626" }}>
                  <span style={{ fontSize: 7 }}>●</span>{selected.is_open ? "Open Now" : "Closed"}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 6, lineHeight: 1.2 }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 10 }}>{selected.description}</div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>📍 {selected.address}</div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <button onClick={() => setShowReservation(selected)}
                  style={{ flex: 1, padding: "12px", background: "#FFF0ED", color: CORAL, border: "1.5px solid #FFD0C0", borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  📅 Reserve a table
                </button>
                {cart.restaurantId === selected.id && cart.totalItems > 0 && (
                  <button onClick={() => setTab("cart")}
                    style={{ padding: "12px 16px", background: CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    🛒 {cart.totalItems}
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1.5px solid #F5F5F5", marginBottom: 20 }}>
                {["menu", "updates", "info"].map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 12, fontWeight: 700, color: detailTab === t ? CORAL : "#C0C0C0", border: "none", background: "transparent", borderBottom: `2px solid ${detailTab === t ? CORAL : "transparent"}`, marginBottom: -1.5, cursor: "pointer" }}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* ── MENU TAB with Add to Cart ── */}
              {detailTab === "menu" && (
                <>
                  {!selected.is_open && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 16 }}>Currently closed — menu shown for reference</div>}
                  {(selected.menu_categories || []).map(cat => (
                    <div key={cat.id} style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#C0C0C0", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F5F5F5" }}>{cat.name}</div>
                      {cat.menu_items.map(item => {
                        const qty = cart.getQuantity(item.id);
                        return (
                          <div key={item.id} style={{ borderBottom: "1px solid #F5F5F5", paddingBottom: 14, marginBottom: 2 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingTop: 14 }}>
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
                                <div style={{ fontSize: 14, fontWeight: 800, color: item.is_available ? CORAL : "#EBEBEB", marginBottom: 8 }}>₦{Number(item.price).toLocaleString()}</div>
                                {item.is_available && selected.is_open && (
                                  qty === 0 ? (
                                    <button onClick={() => handleAddToCart(item, selected)}
                                      style={{ display: "flex", alignItems: "center", gap: 5, background: CORAL, border: "none", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", borderRadius: 10, padding: "7px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      + Add to cart
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <button onClick={() => cart.removeItem(item.id)} style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #EBEBEB", background: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                      <span style={{ fontSize: 15, fontWeight: 800, color: DARK, minWidth: 18, textAlign: "center" }}>{qty}</span>
                                      <button onClick={() => handleAddToCart(item, selected)} style={{ width: 30, height: 30, borderRadius: 8, background: CORAL, border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
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
                  {cart.restaurantId === selected.id && cart.totalItems > 0 && (
                    <div style={{ position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 390, background: CORAL, borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", zIndex: 50, boxShadow: "0 4px 20px rgba(255,98,64,0.4)" }}
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
                        <button onClick={() => user ? toggleLike(p.id) : setAuthMode("login")} style={{ display: "flex", alignItems: "center", gap: 6, background: liked ? "#FFF0ED" : "transparent", border: "none", borderRadius: 20, padding: "5px 10px", cursor: "pointer" }}>
                          <span style={{ fontSize: 13 }}>{liked ? "❤️" : "🤍"}</span><span style={{ fontSize: 12, fontWeight: 700, color: liked ? CORAL : "#B0B0B0" }}>{p.like_count}</span>
                        </button>
                      </div>
                    </div>
                  ); })}</div>;
              })()}

              {detailTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[{ ico: "📍", label: "Location", val: selected.address }, { ico: "🕐", label: "Status", val: selected.is_open ? "Open Now" : "Closed", color: selected.is_open ? "#16A34A" : "#DC2626" }, { ico: "🚚", label: "Delivery", val: "Contact restaurant directly" }, { ico: "🍽️", label: "Cuisine", val: selected.category }].map(chip => (
                    <div key={chip.label} style={{ background: BG, borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{chip.ico}</div>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600, marginBottom: 2 }}>{chip.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: chip.color || DARK }}>{chip.val}</div>
                    </div>
                  ))}
                  <button onClick={() => setShowReservation(selected)} style={{ width: "100%", padding: "14px", background: CORAL, color: "#fff", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 8 }}>📅 Reserve a Table</button>
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
            <button onClick={() => setAuthMode("login")} style={{ background: CORAL, color: "#fff", border: "none", borderRadius: 16, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Sign In / Sign Up</button>
          </div>
        )}

        {tab === "store" && user && isAdmin && (
          <AdminPanel />
        )}

        {tab === "store" && user && !isOwner && !isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🙋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Not an owner account</div>
            <div style={{ fontSize: 14, color: "#888" }}>Contact the MESA team to register your restaurant.</div>
          </div>
        )}

        {tab === "store" && user && isOwner && ownerR && (
          <>
            <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 20px", borderBottom: "1px solid #F0EDE8" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 2 }}>My Store</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Manage your presence on MESA</div>
              {restaurants.filter(r => r.owner_id === user.id).length > 1 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
                  {restaurants.filter(r => r.owner_id === user.id).map(r => (
                    <button key={r.id} onClick={() => setOwnerRId(r.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1.5px solid", borderColor: (ownerRId || ownerR.id) === r.id ? CORAL : "#EBEBEB", background: (ownerRId || ownerR.id) === r.id ? "#FFF0ED" : "#fff", color: (ownerRId || ownerR.id) === r.id ? CORAL : "#888", whiteSpace: "nowrap" }}>{r.icon} {r.name.split(" ")[0]}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "16px 20px" }}>
              {/* Status */}
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 20, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Store Status</div><div style={{ fontSize: 26, fontWeight: 800, color: ownerR.is_open ? "#16A34A" : "#DC2626" }}>{ownerR.is_open ? "Open" : "Closed"}</div></div>
                  <Toggle checked={ownerR.is_open} onChange={() => toggleOpen(ownerR.is_open)} />
                </div>
              </div>

              {/* Stats */}
              {(() => { const all = (ownerR.menu_categories || []).flatMap(c => c.menu_items || []); return (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {[{ n: all.length, l: "Items" }, { n: all.filter(i => i.is_available).length, l: "Avail" }, { n: posts.filter(p => p.restaurant_id === ownerR.id).length, l: "Posts" }, { n: incomingOrders.length, l: "Orders" }].map(s => (
                    <div key={s.l} style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: CORAL }}>{s.n}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              ); })()}

              {/* ── Incoming orders ── */}
              {incomingOrders.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Incoming Orders</div>
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
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{(order.order_items || []).map(i => `${i.name} x${i.quantity}`).join(", ")}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: CORAL }}>₦{Number(order.subtotal).toLocaleString()}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            {order.status === "pending" && <button onClick={() => updateStatus(order.id, "confirmed")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Confirm</button>}
                            {order.status === "confirmed" && <button onClick={() => updateStatus(order.id, "preparing")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10, border: "none", background: "#FFF0ED", color: CORAL, cursor: "pointer" }}>Preparing</button>}
                            {order.status === "preparing" && <button onClick={() => updateStatus(order.id, "ready")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10, border: "none", background: "#F0FDF4", color: "#16A34A", cursor: "pointer" }}>Ready</button>}
                            {!["completed","cancelled"].includes(order.status) && <button onClick={() => updateStatus(order.id, "cancelled")} style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10, border: "none", background: "#FEF2F2", color: "#DC2626", cursor: "pointer" }}>Cancel</button>}
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
                    <button disabled={!postText.trim() || saving} onClick={submitPost} style={{ background: CORAL, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 22px", borderRadius: 14, border: "none", cursor: "pointer", opacity: (!postText.trim() || saving) ? 0.4 : 1 }}>{saving ? "Posting..." : "Post Update"}</button>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 16px" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Menu</div>
              {(ownerR.menu_categories || []).map(cat => (
                <div key={cat.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#888", padding: "8px 0", borderBottom: "1px solid #F0EDE8", marginBottom: 8 }}>{cat.name}</div>
                  {cat.menu_items.map(item => (
                    <DashMenuItem
                      key={item.id}
                      item={item}
                      restaurantId={ownerR.id}
                      onToggle={() => toggleItem(item.id, item.is_available)}
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

        {/* ══════════ ORDERS ══════════ */}
        {tab === "orders" && (
          user
            ? <OrdersPage user={user} onBrowse={() => setTab("home")} onReview={(order) => setReviewTarget(order)} reviewedOrderIds={reviewedOrderIds} />
            : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🧾</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1C1C1E", marginBottom: 8 }}>Sign in to see your orders</div>
                <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>Your order history will appear here once you sign in.</div>
                <button onClick={() => setAuthMode("login")} style={{ background: "#FF6240", color: "#fff", border: "none", borderRadius: 16, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Sign In</button>
              </div>
            )
        )}

        {tab !== "cart" && <BottomNav tab={tab} setTab={handleTabChange} cartCount={cart.totalItems} />}
      </div>
    </>
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
