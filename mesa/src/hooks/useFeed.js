import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 10;

export function useFeed(userId) {
  const [posts, setPosts]             = useState([]);
  const [likedIds, setLikedIds]       = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [page, setPage]               = useState(0);

  useEffect(() => {
    fetchPosts(0);
    if (userId) fetchUserLikes();

    const channel = supabase
      .channel("feed-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
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
            prev.map((p) => p.id === payload.new.id
              ? { ...p, like_count: payload.new.like_count ?? p.like_count }
              : p
            )
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function fetchPosts(pageNum = 0) {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("posts")
      .select(`*, restaurants (id, name, icon, bg_from, bg_to, category, logo_url)`)
      .order("created_at", { ascending: false })
      .range(from, to);

    const newPosts = data || [];
    setHasMore(newPosts.length === PAGE_SIZE);

    if (pageNum === 0) setPosts(newPosts);
    else setPosts((prev) => [...prev, ...newPosts]);

    setPage(pageNum);
    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  }

  async function fetchMore() {
    if (loadingMore || !hasMore) return;
    await fetchPosts(page + 1);
  }

  async function fetchSinglePost(postId) {
    const { data } = await supabase
      .from("posts")
      .select(`*, restaurants (id, name, icon, bg_from, bg_to, category, logo_url)`)
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
    if (!userId) return;
    const alreadyLiked = likedIds.has(postId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => p.id === postId
        ? { ...p, like_count: (p.like_count || 0) + (alreadyLiked ? -1 : 1) }
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

  // ── Comments ─────────────────────────────────────────────────
  async function fetchComments(postId) {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(full_name)`)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);
    return data || [];
  }

  async function addComment(postId, text) {
    if (!userId || !text.trim()) return { error: "Not authenticated" };
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: userId, text: text.trim() })
      .select(`*, profiles(full_name)`)
      .single();

    if (!error) {
      setPosts((prev) =>
        prev.map((p) => p.id === postId
          ? { ...p, comment_count: (p.comment_count || 0) + 1 }
          : p
        )
      );
    }
    return { data, error };
  }

  return {
    posts, likedIds, loading, loadingMore, hasMore,
    toggleLike, fetchMore, fetchComments, addComment,
  };
}
