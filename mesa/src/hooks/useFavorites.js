// src/hooks/useFavorites.js
// Manages the authenticated user's favorited menu items.
// Keeps a Set of menu_item_id strings in state; syncs with Supabase.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useFavorites(userId) {
  const [favorites, setFavorites] = useState(new Set());

  // Fetch on mount / auth change
  useEffect(() => {
    if (!userId) { setFavorites(new Set()); return; }
    supabase
      .from("favorites")
      .select("menu_item_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setFavorites(new Set(data.map(r => r.menu_item_id)));
      });
  }, [userId]);

  // Optimistic toggle — flips local state immediately, then syncs DB
  const toggleFavorite = useCallback(async (menuItemId) => {
    if (!userId) return;
    const isFav = favorites.has(menuItemId);
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(menuItemId); else next.add(menuItemId);
      return next;
    });
    if (isFav) {
      await supabase.from("favorites").delete()
        .eq("user_id", userId).eq("menu_item_id", menuItemId);
    } else {
      await supabase.from("favorites").insert({ user_id: userId, menu_item_id: menuItemId });
    }
  }, [userId, favorites]);

  return { favorites, toggleFavorite };
}
