// src/hooks/useStories.js
// Handles: fetching active stories, uploading story images, recording views

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ── Fetch all active stories (not expired) ───────────────────
// Returns stories grouped by restaurant so the UI can show
// one ring per restaurant even if they posted multiple stories.
export function useStories(userId) {
  const [stories, setStories]     = useState([]);   // raw story rows
  const [viewedIds, setViewedIds] = useState(new Set()); // story IDs this user has seen
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchStories();
    if (userId) fetchUserViews();

    // Realtime: new stories appear on home screen instantly
    const channel = supabase
      .channel("live-stories")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        (payload) => {
          // Only add if not already expired (sanity check)
          if (new Date(payload.new.expires_at) > new Date()) {
            setStories((prev) => [payload.new, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "stories" },
        (payload) => {
          setStories((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function fetchStories() {
    setLoading(true);
    const { data } = await supabase
      .from("stories")
      .select(`
        *,
        restaurants (id, name, icon, bg_from, bg_to, category)
      `)
      .gt("expires_at", new Date().toISOString())   // only active stories
      .order("created_at", { ascending: false });

    setStories(data || []);
    setLoading(false);
  }

  async function fetchUserViews() {
    const { data } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("user_id", userId);
    setViewedIds(new Set((data || []).map((v) => v.story_id)));
  }

  // Call this when a user opens and views a story
  async function markViewed(storyId) {
    if (!userId || viewedIds.has(storyId)) return;
    setViewedIds((prev) => new Set([...prev, storyId]));
    await supabase
      .from("story_views")
      .insert({ story_id: storyId, user_id: userId })
      .then(() => {});   // fire-and-forget, ignore duplicate errors
  }

  // Group stories by restaurant (for the ring UI)
  // Returns: [{ restaurant, stories: [...], hasUnviewed: bool }]
  const grouped = groupByRestaurant(stories, viewedIds);

  return { stories, grouped, viewedIds, loading, markViewed, refetch: fetchStories };
}


// ── Upload a story (owner only) ──────────────────────────────
export function useStoryUpload(restaurantId) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState(null);

  async function uploadStory({ file, caption }) {
    if (!file || !restaurantId) return { error: "Missing file or restaurant" };

    setUploading(true);
    setError(null);

    try {
      // 1. Upload image to Supabase Storage (bucket: "stories")
      const ext      = file.name.split(".").pop();
      const fileName = `${restaurantId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("stories")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) throw uploadErr;

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // 3. Insert story row (expires in 24h by default via DB default)
      const { data, error: insertErr } = await supabase
        .from("stories")
        .insert({
          restaurant_id: restaurantId,
          image_url: imageUrl,
          caption: caption?.trim() || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setUploading(false);
      return { data, error: null };

    } catch (err) {
      setUploading(false);
      setError(err.message);
      return { data: null, error: err.message };
    }
  }

  async function deleteStory(storyId, imagePath) {
    // Delete the DB row (cascades automatically)
    await supabase.from("stories").delete().eq("id", storyId);
    // Also remove the file from storage
    if (imagePath) {
      await supabase.storage.from("stories").remove([imagePath]);
    }
  }

  return { uploading, error, uploadStory, deleteStory };
}


// ── Helper ───────────────────────────────────────────────────
function groupByRestaurant(stories, viewedIds) {
  const map = new Map();
  for (const story of stories) {
    const r = story.restaurants;
    if (!r) continue;
    if (!map.has(r.id)) {
      map.set(r.id, { restaurant: r, stories: [], hasUnviewed: false });
    }
    const entry = map.get(r.id);
    entry.stories.push(story);
    if (!viewedIds.has(story.id)) entry.hasUnviewed = true;
  }
  return Array.from(map.values());
}
