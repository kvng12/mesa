// src/hooks/useRestaurants.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ── Public: all restaurants with their menus ─────────────────
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    fetchAll();

    // Realtime: open/closed status broadcasts instantly
    const channel = supabase
      .channel("restaurants-open-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) => r.id === payload.new.id ? { ...r, ...payload.new } : r)
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select(`
        *,
        menu_categories (
          id, name, sort_order,
          menu_items (id, name, price, is_available, sort_order, image_url)
        )
      `)
      .order("created_at", { ascending: true });

    if (error) { setError(error.message); }
    else {
      const normalized = (data || []).map((r) => ({
        ...r,
        menu_categories: (r.menu_categories || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((cat) => ({
            ...cat,
            menu_items: (cat.menu_items || []).sort((a, b) => a.sort_order - b.sort_order),
          })),
      }));
      setRestaurants(normalized);
    }
    setLoading(false);
  }

  return { restaurants, loading, error, refetch: fetchAll };
}


// ── Owner: manage their own restaurant ───────────────────────
export function useOwnerRestaurant(restaurantId) {
  const [saving, setSaving] = useState(false);

  async function toggleOpen(currentValue) {
    const { error } = await supabase
      .from("restaurants")
      .update({ is_open: !currentValue })
      .eq("id", restaurantId);
    return { error };
  }

  async function toggleItem(itemId, currentValue) {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !currentValue })
      .eq("id", itemId);
    return { error };
  }

  async function updateItemImage(itemId, imageUrl) {
    const { error } = await supabase
      .from("menu_items")
      .update({ image_url: imageUrl })
      .eq("id", itemId);
    return { error };
  }

  async function uploadFoodImage(file, restaurantId, itemId) {
    const ext      = file.name.split(".").pop();
    const fileName = `${restaurantId}/${itemId}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("food-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: true, contentType: file.type });

    if (uploadErr) return { url: null, error: uploadErr };

    const { data: urlData } = supabase.storage
      .from("food-images")
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, error: null };
  }

  async function createPost({ postType, text }) {
    setSaving(true);
    const { data, error } = await supabase
      .from("posts")
      .insert({ restaurant_id: restaurantId, post_type: postType, text })
      .select()
      .single();
    setSaving(false);
    return { data, error };
  }

  return { saving, toggleOpen, toggleItem, updateItemImage, uploadFoodImage, createPost };
}
