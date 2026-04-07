// src/screens/ReviewModal.jsx
import { useState } from "react";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

export default function ReviewModal({ order, onClose, onSubmit }) {
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [comment, setComment]   = useState("");
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const r = order.restaurants;

  async function submit() {
    if (!rating) { setError("Please select a rating"); return; }
    setSubmit(true);
    setError("");
    const { error: err } = await onSubmit({
      orderId:      order.id,
      restaurantId: r.id,
      rating,
      comment,
    });
    setSubmit(false);
    if (err) setError(err.message || "Failed to submit. Try again.");
    else setDone(true);
  }

  const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 350, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "28px 24px 44px", width: "100%" }}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#EDE9E4", borderRadius: 4, margin: "0 auto 24px" }} />

        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌟</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>Your review helps other customers and gives the restaurant valuable feedback.</div>
            <button onClick={onClose} style={btnStyle}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 4 }}>Rate your order</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 22 }}>
              {r?.icon} {r?.name}
            </div>

            {/* Stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(n)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, fontSize: 36, transition: "transform 0.15s", transform: (hovered || rating) >= n ? "scale(1.15)" : "scale(1)" }}
                >
                  <span style={{ filter: (hovered || rating) >= n ? "none" : "grayscale(1) opacity(0.3)" }}>⭐</span>
                </button>
              ))}
            </div>

            {/* Star label */}
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: rating ? CORAL : "#C8C0B8", marginBottom: 20, minHeight: 20 }}>
              {STAR_LABELS[hovered || rating]}
            </div>

            {/* Comment */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>Comment (optional)</div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 300))}
              placeholder="What did you think? Was the food good? Was delivery on time?"
              style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 14, background: BG, outline: "none", fontSize: 14, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, padding: "12px 14px", lineHeight: 1.6, minHeight: 90, resize: "none", marginBottom: 4 }}
            />
            <div style={{ fontSize: 10, color: "#C0C0C0", textAlign: "right", marginBottom: 16 }}>{comment.length}/300</div>

            {error && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: "0 0 auto", padding: "14px 18px", background: BG, color: "#888", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Skip</button>
              <button onClick={submit} disabled={submitting} style={{ ...btnStyle, flex: 1, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "14px", background: CORAL, color: "#fff", border: "none",
  borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
