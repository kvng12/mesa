// src/components/MenuItemSheet.jsx
// Bottom-sheet detail view for a single menu item.
// Opens when a customer taps a menu item card in the restaurant detail view.

import { useState, useEffect } from "react";

const PRIMARY      = "#8B1A1A";
const PRIMARY_DARK = "#6B1414";
const ACCENT       = "#F4C430";
const DARK         = "#1C1C1E";
const TEXT_MUTED   = "#666666";
const BG           = "#FFFFFF";
const BG_SOFT      = "#F7F5F2";
const BORDER       = "#ECE6DE";

function HeartIcon({ filled, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? PRIMARY : "none"} stroke={filled ? PRIMARY : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function MenuItemSheet({ item, restaurant, allItems, cart, onClose, onAddToCart, favorites, toggleFavorite }) {
  const [qty, setQty] = useState(1);
  const [visible, setVisible] = useState(false);

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Reset qty whenever a different item is shown
  useEffect(() => {
    setQty(1);
  }, [item?.id]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleAdd() {
    // Add qty times
    for (let i = 0; i < qty; i++) {
      onAddToCart(item, restaurant);
    }
    handleClose();
  }

  // Recommended: same category, excluding self, ≥2 to render, sort_order DESC fallback
  const recommended = (() => {
    if (!allItems?.length) return [];
    const recs = allItems.filter(
      m => m.category_id === item.category_id && m.id !== item.id && m.is_available
    ).sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0));
    return recs.length >= 2 ? recs.slice(0, 6) : [];
  })();

  const cartQty = cart.getQuantity(item.id);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0,
          background: `rgba(0,0,0,${visible ? 0.55 : 0})`,
          transition: "background 0.28s ease",
          zIndex: 500,
          maxWidth: 430, margin: "0 auto",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0%" : "100%"})`,
          transition: "transform 0.28s cubic-bezier(0.32, 0, 0.15, 1)",
          width: "100%", maxWidth: 430,
          background: BG,
          borderRadius: "24px 24px 0 0",
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 501,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          paddingBottom: "calc(84px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: BORDER }} />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: "50%",
            background: BG_SOFT, border: "none",
            fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: DARK,
          }}
        >✕</button>

        {/* Heart / favorites toggle — PHASE 3 */}
        {favorites && toggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
            style={{
              position: "absolute", top: 16, right: 56,
              width: 32, height: 32, borderRadius: "50%",
              background: BG_SOFT, border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <HeartIcon filled={favorites.has(item.id)} />
          </button>
        )}

        {/* Hero image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: "100%", height: 220, objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: 180,
            background: BG_SOFT,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64,
          }}>
            {restaurant?.icon || "🍽️"}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "18px 20px 0" }}>

          {/* Name + price row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, lineHeight: 1.25, flex: 1 }}>
              {item.name}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, whiteSpace: "nowrap" }}>
              ₦{Number(item.price).toLocaleString()}
            </div>
          </div>

          {/* Availability badge */}
          {!item.is_available && (
            <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, background: "#FEF2F2", borderRadius: 20, padding: "3px 10px", display: "inline-block", marginBottom: 10 }}>
              Not available today
            </div>
          )}

          {/* Rating badge */}
          {item.review_count > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "#666666", marginBottom: 8, marginTop: 2 }}>
              ⭐ {Number(item.avg_rating).toFixed(1)} ({item.review_count} review{item.review_count !== 1 ? "s" : ""})
            </div>
          )}

          {/* Item description */}
          {item.description?.trim() && (
            <div style={{ fontSize: 14, fontWeight: 400, color: TEXT_MUTED, lineHeight: 1.5, marginBottom: 12 }}>
              {item.description}
            </div>
          )}

          {/* Quantity stepper */}
          {item.is_available && restaurant?.is_open && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 16, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginRight: "auto" }}>Quantity</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: `1.5px solid ${BORDER}`, background: BG,
                    fontSize: 20, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: qty === 1 ? BORDER : DARK,
                  }}
                >−</button>
                <span style={{ fontSize: 18, fontWeight: 800, color: DARK, minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: PRIMARY, border: "none",
                    fontSize: 20, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff",
                  }}
                >+</button>
              </div>
            </div>
          )}

          {/* PHASE 3: extras / add-ons section goes here */}

          {/* Recommended items */}
          {recommended.length >= 2 && (
            <div style={{ marginTop: 24, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 12 }}>You might also like</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                {recommended.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      flexShrink: 0, width: 130,
                      background: BG_SOFT, borderRadius: 16,
                      overflow: "hidden", cursor: "pointer",
                    }}
                    onClick={() => {
                      // Clicking a recommendation swaps the sheet to that item
                      // The parent handles this via onAddToCart's open-sheet path
                    }}
                  >
                    {rec.image_url ? (
                      <img src={rec.image_url} alt={rec.name} style={{ width: "100%", height: 80, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: 80, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                        {restaurant?.icon || "🍽️"}
                      </div>
                    )}
                    <div style={{ padding: "8px 10px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: DARK, lineHeight: 1.3, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {rec.name}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PRIMARY }}>
                        ₦{Number(rec.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* favorites toggle rendered near close button above */}
      </div>

      {/* Sticky Add-to-Cart button */}
      {item.is_available && restaurant?.is_open && (
        <div style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom))",
          left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430,
          padding: "12px 20px",
          background: BG,
          borderTop: `1px solid ${BORDER}`,
          zIndex: 502,
        }}>
          <button
            onClick={handleAdd}
            style={{
              width: "100%", padding: "15px",
              background: PRIMARY, color: "#fff",
              border: "none", borderRadius: 999,
              fontSize: 15, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 13, fontWeight: 800 }}>
              {qty}
            </span>
            <span>Add to cart</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              ₦{Number(item.price * qty).toLocaleString()}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
