// src/screens/FavoritesScreen.jsx
// Displays the logged-in user's favorited menu items.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import MenuItemSheet from "../components/MenuItemSheet";

const PRIMARY    = "#8B1A1A";
const DARK       = "#1C1C1E";
const TEXT_MUTED = "#666666";
const BG_SOFT    = "#F7F5F2";
const BORDER     = "#ECE6DE";

export default function FavoritesScreen({ user, favorites, toggleFavorite, restaurants, cart, onAddToCart }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetItem, setSheetItem]   = useState(null); // { item, restaurant }

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("favorites")
      .select("menu_item_id, menu_items(id, name, price, is_available, image_url, category_id, restaurant_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        const resolved = data
          .map(row => {
            const mi = row.menu_items;
            if (!mi) return null;
            const restaurant = restaurants.find(r => r.id === mi.restaurant_id);
            return restaurant ? { item: mi, restaurant } : null;
          })
          .filter(Boolean);

        // Fetch ratings for these items and merge
        const itemIds = resolved.map(r => r.item.id);
        if (itemIds.length) {
          const { data: ratingRows } = await supabase
            .from("menu_item_ratings")
            .select("menu_item_id, avg_rating, review_count")
            .in("menu_item_id", itemIds);
          const lookup = {};
          (ratingRows || []).forEach(r => { lookup[r.menu_item_id] = r; });
          resolved.forEach(r => {
            r.item.avg_rating   = lookup[r.item.id]?.avg_rating   ?? null;
            r.item.review_count = lookup[r.item.id]?.review_count ?? 0;
          });
        }

        setItems(resolved);
        setLoading(false);
      });
  }, [user?.id, favorites]); // re-fetch when favorites Set changes (catches unfavorites)

  // Not logged in
  if (!user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 32px", textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🤍</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Save your favourites</div>
        <div style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.7 }}>Sign in to save menu items and find them here instantly.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "max(env(safe-area-inset-top), 52px)", paddingBottom: "calc(80px + env(safe-area-inset-bottom))", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>Your Favourites</div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 20px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 76, borderRadius: 16, background: BG_SOFT }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🤍</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 8 }}>No favourites yet</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.7 }}>
            Tap the heart on any menu item to save it here.
          </div>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 20px" }}>
          {items.map(({ item, restaurant }) => {
            const isFav = favorites.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setSheetItem({ item, restaurant })}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
              >
                {/* Thumbnail */}
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} style={{ width: 62, height: 62, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 62, height: 62, borderRadius: 12, background: BG_SOFT, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                    {restaurant.icon || "🍽️"}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{restaurant.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: PRIMARY }}>₦{Number(item.price).toLocaleString()}</div>
                </div>

                {/* Heart button */}
                <button
                  onClick={e => { e.stopPropagation(); toggleFavorite(item.id); }}
                  style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: BG_SOFT, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <HeartIcon filled={isFav} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Item sheet */}
      {sheetItem && (
        <MenuItemSheet
          item={sheetItem.item}
          restaurant={sheetItem.restaurant}
          allItems={[]}
          cart={cart}
          onClose={() => setSheetItem(null)}
          onAddToCart={onAddToCart}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}

function HeartIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? PRIMARY : "none"} stroke={filled ? PRIMARY : "#C0C0C0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
