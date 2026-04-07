import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useFeed(userId) {
  const [posts, setPosts]         = useState([]);
  const [likedIds, setLikedIds]   = useState(new Set());
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchPosts();
    if (userId) fetchUserLikes();

    // Realtime: new posts appear immediately in every customer's feed
    const channel = supabase
      .channel("feed-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          // Fetch full post with restaurant join before prepending
          fetchSinglePost(payload.new.id).then((post) => {
            if (post) setPosts((prev) => [post, ...prev]);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) => p.id === payload.new.id ? { ...p, like_count: payload.new.like_count } : p)
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select(`*, restaurants (id, name, icon, bg_from, bg_to, category)`)
      .order("created_at", { ascending: false })
      .limit(50);

    setPosts(data || []);
    setLoading(false);
  }

  async function fetchSinglePost(postId) {
    const { data } = await supabase
      .from("posts")
      .select(`*, restaurants (id, name, icon, bg_from, bg_to, category)`)
      .eq("id", postId)
      .single();
    return data;
  }

  async function fetchUserLikes() {
    const { data } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId);
    setLikedIds(new Set((data || []).map((l) => l.post_id)));
  }

  async function toggleLike(postId) {
    if (!userId) return;             // must be logged in to like
    const alreadyLiked = likedIds.has(postId);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => p.id === postId
        ? { ...p, like_count: p.like_count + (alreadyLiked ? -1 : 1) }
        : p
      )
    );

    if (alreadyLiked) {
      await supabase.from("likes").delete()
        .eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    }
  }

  return { posts, likedIds, loading, toggleLike };
}
