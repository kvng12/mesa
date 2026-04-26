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
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*, menu_categories(*)")
      .order("created_at", { ascending: true });

    if (error) { setError(error.message); }
    else { setRestaurants(data || []); }
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

  async function uploadBanner(file) {
    const ext      = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${restaurantId}/banner-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("restaurant-logos") // reuse existing public bucket
      .upload(fileName, file, { cacheControl: "3600", upsert: true, contentType: file.type });

    if (uploadErr) return { url: null, error: uploadErr };

    const { data: urlData } = supabase.storage
      .from("restaurant-logos")
      .getPublicUrl(fileName);

    const url = urlData.publicUrl;
    const { error: updateErr } = await supabase
      .from("restaurants")
      .update({ banner_url: url })
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
    uploadLogo, uploadBanner, createPost, togglePaymentMethod,
    updateOpeningHours, uploadPostMedia,
  };
}
