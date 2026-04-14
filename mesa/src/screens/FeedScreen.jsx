// src/screens/FeedScreen.jsx — TikTok-style vertical video/photo feed

import { useState, useEffect, useRef, useCallback } from "react";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ── Comment sheet ─────────────────────────────────────────────
function CommentSheet({ post, user, onClose, fetchComments, addComment, onLogin }) {
  const [comments, setComments] = useState([]);
  const [loadingCmts, setLoadingCmts] = useState(true);
  const [text, setText]     = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    fetchComments(post.id).then(data => {
      setComments(data || []);
      setLoadingCmts(false);
    });
  }, [post.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSend() {
    if (!user) { onLogin(); return; }
    if (!text.trim() || sending) return;
    setSending(true);
    const { data, error } = await addComment(post.id, text);
    if (data && !error) setComments(prev => [...prev, data]);
    setSending(false);
    setText("");
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200,
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, background: "#fff",
        borderRadius: "20px 20px 0 0", zIndex: 201,
        display: "flex", flexDirection: "column",
        maxHeight: "70vh", fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E0E0E0" }} />
        </div>
        <div style={{ padding: "0 16px 12px", borderBottom: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: DARK }}>Comments {post.comment_count > 0 ? `(${post.comment_count})` : ""}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#C0C0C0" }}>✕</button>
        </div>
        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {loadingCmts ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "#B0B0B0" }}>Loading...</div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13, color: "#B0B0B0", fontWeight: 600 }}>No comments yet. Be the first!</div>
            </div>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${CORAL}, #FF8C6B)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#fff",
              }}>
                {c.profiles?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 3 }}>
                  {c.profiles?.full_name || "User"}
                  <span style={{ fontSize: 10, color: "#C0C0C0", fontWeight: 500, marginLeft: 8 }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: "#2D2D2D", lineHeight: 1.5 }}>{c.text}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {/* Input */}
        <div style={{ padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid #F0EDE8", display: "flex", gap: 8, alignItems: "center", background: "#fff" }}>
          <input
            value={text}
            onChange={e => setText(e.target.value.slice(0, 300))}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
            placeholder={user ? "Add a comment..." : "Sign in to comment"}
            readOnly={!user}
            onClick={() => { if (!user) onLogin(); }}
            style={{ flex: 1, border: "1.5px solid #EBEBEB", borderRadius: 20, padding: "10px 14px", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", background: "#F7F5F2", color: DARK }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{ width: 38, height: 38, borderRadius: "50%", background: text.trim() ? CORAL : "#E0E0E0", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Heart animation overlay ───────────────────────────────────
function HeartBurst({ x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "absolute", left: x - 40, top: y - 40,
      fontSize: 80, pointerEvents: "none", zIndex: 10,
      animation: "heartBurst 0.9s cubic-bezier(.36,.07,.19,.97) both",
    }}>❤️</div>
  );
}

// ── GET gradient for text posts ───────────────────────────────
const GRADIENTS = [
  "linear-gradient(135deg, #FF6240, #FF8C6B)",
  "linear-gradient(135deg, #7C3AED, #A78BFA)",
  "linear-gradient(135deg, #0EA5E9, #38BDF8)",
  "linear-gradient(135deg, #16A34A, #4ADE80)",
  "linear-gradient(135deg, #D97706, #FCD34D)",
];

// ── Single feed item ──────────────────────────────────────────
function FeedItem({ post, isActive, liked, onLike, onComment, onRestaurant, onOrder, itemRef }) {
  const videoRef  = useRef();
  const [hearts, setHearts] = useState([]);
  const lastTap   = useRef(0);
  const [muted, setMuted] = useState(true);

  const r = post.restaurants;
  const gradIdx = post.id ? post.id.charCodeAt(0) % GRADIENTS.length : 0;

  // Auto-play/pause video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive]);

  function handleTap(e) {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // Double tap — like
      if (!liked) {
        onLike();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setHearts(prev => [...prev, { id, x, y }]);
      }
    }
    lastTap.current = now;
  }

  return (
    <div
      ref={itemRef}
      onClick={handleTap}
      style={{
        height: "100dvh",
        scrollSnapAlign: "start",
        position: "relative",
        overflow: "hidden",
        background: "#000",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* ── Media ── */}
      {post.media_type === "video" && post.media_url ? (
        <video
          ref={videoRef}
          src={post.media_url}
          poster={post.thumbnail_url || undefined}
          loop
          muted={muted}
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : post.media_url ? (
        <img
          src={post.media_url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          draggable={false}
        />
      ) : (
        // Text-only post — gradient background
        <div style={{
          width: "100%", height: "100%",
          background: r ? `linear-gradient(155deg, ${r.bg_from || CORAL}, ${r.bg_to || "#FF8C6B"})` : GRADIENTS[gradIdx],
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            maxWidth: "80%", textAlign: "center",
            fontSize: 22, fontWeight: 800, color: "#fff",
            lineHeight: 1.4, textShadow: "0 2px 12px rgba(0,0,0,0.25)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {post.text}
          </div>
        </div>
      )}

      {/* ── Dark gradient overlays ── */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.3) 100%)",
      }} />

      {/* ── Heart burst animations ── */}
      {hearts.map(h => (
        <HeartBurst key={h.id} x={h.x} y={h.y} onDone={() => setHearts(prev => prev.filter(p => p.id !== h.id))} />
      ))}

      {/* ── Right action bar ── */}
      <div style={{
        position: "absolute", right: 12, bottom: "calc(120px + env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        zIndex: 5,
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Like */}
        <button onClick={onLike} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: liked ? "rgba(255,98,64,0.25)" : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            transition: "transform 0.15s",
            transform: liked ? "scale(1.15)" : "scale(1)",
          }}>
            {liked ? "❤️" : "🤍"}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            {(post.like_count || 0).toLocaleString()}
          </span>
        </button>

        {/* Comment */}
        <button onClick={onComment} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>💬</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            {(post.comment_count || 0).toLocaleString()}
          </span>
        </button>

        {/* Mute/Unmute for videos */}
        {post.media_type === "video" && post.media_url && (
          <button
            onClick={() => setMuted(m => !m)}
            style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              {muted ? "🔇" : "🔊"}
            </div>
          </button>
        )}
      </div>

      {/* ── Bottom info row ── */}
      <div style={{
        position: "absolute", bottom: "calc(80px + env(safe-area-inset-bottom))",
        left: 0, right: 60,
        padding: "0 14px",
        zIndex: 5,
      }}
        onClick={e => e.stopPropagation()}
      >
        {/* Restaurant info */}
        {r && (
          <div onClick={onRestaurant} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: `linear-gradient(135deg, ${r.bg_from || CORAL}, ${r.bg_to || "#FF8C6B"})`,
              border: "2px solid rgba(255,255,255,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0, overflow: "hidden",
            }}>
              {r.logo_url
                ? <img src={r.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : r.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{Array.isArray(r.category) ? r.category[0] : r.category}</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 8px", backdropFilter: "blur(4px)" }}>
              Follow
            </div>
          </div>
        )}

        {/* Caption */}
        {post.text && post.media_url && (
          <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, marginBottom: 8, textShadow: "0 1px 4px rgba(0,0,0,0.5)", fontWeight: 500, maxWidth: "85%" }}>
            {post.text.length > 100 ? post.text.slice(0, 100) + "…" : post.text}
          </div>
        )}

        {/* Time */}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{timeAgo(post.created_at)}</div>
      </div>

      {/* ── Order Now button ── */}
      {r && (
        <button
          onClick={e => { e.stopPropagation(); onOrder(); }}
          style={{
            position: "absolute",
            right: 12,
            bottom: "calc(80px + env(safe-area-inset-bottom))",
            background: CORAL,
            color: "#fff", border: "none",
            borderRadius: 20, padding: "10px 16px",
            fontSize: 12, fontWeight: 800,
            cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: "0 2px 12px rgba(255,98,64,0.5)",
            zIndex: 5, whiteSpace: "nowrap",
          }}
        >
          Order Now
        </button>
      )}
    </div>
  );
}

// ── Main TikTok Feed ──────────────────────────────────────────
export default function FeedScreen({
  posts, likedIds, loading, loadingMore, hasMore,
  toggleLike, fetchMore, fetchComments, addComment,
  user, onLogin, onNavigateToRestaurant, onOrder,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentPost, setCommentPost]   = useState(null);
  const itemRefs  = useRef([]);
  const observerRef = useRef(null);

  // Set up IntersectionObserver to track the visible post
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.indexOf(entry.target);
            if (idx !== -1) setCurrentIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [posts.length]);

  // Load more when near the end
  useEffect(() => {
    if (posts.length > 0 && currentIndex >= posts.length - 3 && hasMore && !loadingMore) {
      fetchMore();
    }
  }, [currentIndex, posts.length, hasMore, loadingMore]);

  if (loading) return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      maxWidth: 430, margin: "0 auto", zIndex: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Loading feed...</div>
      </div>
    </div>
  );

  if (posts.length === 0) return (
    <div style={{
      position: "fixed", inset: 0, background: "#0A0A0A",
      display: "flex", alignItems: "center", justifyContent: "center",
      maxWidth: 430, margin: "0 auto", zIndex: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Nothing here yet</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
          Restaurants haven't posted anything yet. Check back soon!
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes heartBurst {
          0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          30%  { transform: scale(1.4) rotate(5deg);  opacity: 1; }
          60%  { transform: scale(1.1) rotate(-3deg); opacity: 1; }
          80%  { transform: scale(1.2) rotate(0deg);  opacity: 0.8; }
          100% { transform: scale(1.5) rotate(2deg);  opacity: 0; }
        }
      `}</style>

      {/* Full-screen feed container */}
      <div style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        height: "100dvh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        background: "#000",
        zIndex: 10,
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {posts.map((post, i) => (
          <FeedItem
            key={post.id}
            post={post}
            isActive={i === currentIndex}
            liked={likedIds.has(post.id)}
            onLike={() => user ? toggleLike(post.id) : onLogin()}
            onComment={() => setCommentPost(post)}
            onRestaurant={() => onNavigateToRestaurant(post.restaurants?.id)}
            onOrder={() => onOrder(post.restaurants)}
            itemRef={el => { itemRefs.current[i] = el; }}
          />
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div style={{
            height: "30dvh", display: "flex", alignItems: "center", justifyContent: "center",
            scrollSnapAlign: "start",
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Loading more...
            </div>
          </div>
        )}

        {/* Post counter pill */}
        <div style={{
          position: "fixed",
          top: "max(env(safe-area-inset-top), 16px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "5px 16px",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          zIndex: 15,
          pointerEvents: "none",
        }}>
          {currentIndex + 1} / {posts.length}
        </div>
      </div>

      {/* Comment sheet */}
      {commentPost && (
        <CommentSheet
          post={commentPost}
          user={user}
          onClose={() => setCommentPost(null)}
          fetchComments={fetchComments}
          addComment={addComment}
          onLogin={onLogin}
        />
      )}
    </>
  );
}
