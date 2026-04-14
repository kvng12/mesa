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

    const channel = supabase
      .channel("restaurants-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) => r.id === payload.new.id ? { ...r, ...payload.new } : r)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_items" },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) => ({
              ...r,
              menu_categories: (r.menu_categories || []).map((cat) => ({
                ...cat,
                menu_items: (cat.menu_items || []).map((item) =>
                  item.id === payload.new.id
                    ? { ...item, is_available: payload.new.is_available, image_url: payload.new.image_url }
                    : item
                ),
              })),
            }))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "menu_items" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "menu_items" },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) => ({
              ...r,
              menu_categories: (r.menu_categories || []).map((cat) => ({
                ...cat,
                menu_items: (cat.menu_items || []).filter((item) => item.id !== payload.old.id),
              })),
            }))
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

    // Debug: log raw response to diagnose RLS or missing rows
    console.log("[useRestaurants] fetchAll →", {
      rowCount: data?.length ?? 0,
      error: error?.message ?? null,
      rows: data?.map(r => ({ id: r.id, name: r.name, owner_id: r.owner_id, state: r.state })) ?? [],
    });

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

  async function uploadLogo(file) {
    const ext      = file.name.split(".").pop();
    const fileName = `${restaurantId}/logo-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("restaurant-logos")
      .upload(fileName, file, { cacheControl: "3600", upsert: true, contentType: file.type });

    if (uploadErr) return { url: null, error: uploadErr };

    const { data: urlData } = supabase.storage
      .from("restaurant-logos")
      .getPublicUrl(fileName);

    const url = urlData.publicUrl;
    const { error: updateErr } = await supabase
      .from("restaurants")
      .update({ logo_url: url })
      .eq("id", restaurantId);

    if (updateErr) return { url: null, error: updateErr };
    return { url, error: null };
  }

  async function togglePaymentMethod(method, currentValue) {
    const { error } = await supabase
      .from("restaurants")
      .update({ [method]: !currentValue })
      .eq("id", restaurantId);
    return { error };
  }

  async function updateOpeningHours(hours) {
    const { error } = await supabase
      .from("restaurants")
      .update({ opening_hours: hours })
      .eq("id", restaurantId);
    return { error };
  }

  async function createPost({ postType, text, mediaUrl, mediaType, thumbnailUrl }) {
    setSaving(true);
    const insertData = {
      restaurant_id: restaurantId,
      post_type:     postType,
      text:          text || "",
    };
    if (mediaUrl)     insertData.media_url     = mediaUrl;
    if (mediaType)    insertData.media_type    = mediaType;
    if (thumbnailUrl) insertData.thumbnail_url = thumbnailUrl;

    const { data, error } = await supabase
      .from("posts")
      .insert(insertData)
      .select()
      .single();
    setSaving(false);
    return { data, error };
  }

  async function uploadPostMedia(file, onProgress) {
    const isVideo  = file.type.startsWith("video/");
    const ext      = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const fileName = `${restaurantId}/post-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("post-media")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
        ...(onProgress ? {
          onUploadProgress: (e) => onProgress(Math.round((e.loaded / e.total) * 100)),
        } : {}),
      });

    if (uploadErr) return { url: null, isVideo, error: uploadErr };

    const { data: urlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, isVideo, error: null };
  }

  return {
    saving,
    toggleOpen, toggleItem, updateItemImage, uploadFoodImage,
    uploadLogo, createPost, togglePaymentMethod,
    updateOpeningHours, uploadPostMedia,
  };
}
