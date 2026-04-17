// src/components/DeliveryConfirmation.jsx
// Shown on the customer's order card when status = 'delivered' and confirmed_at is null.
// Customer can confirm receipt (releases escrow) or raise a dispute.
//
// For pickup orders, copy changes to "Have you picked up your order?" / "Yes, I got it"

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";

function formatCountdown(ms) {
  if (ms <= 0) return null; // past due — don't show
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Fallback: if auto_release_at is not set, use created_at + 4 hours
function getReleaseAt(order) {
  if (order.auto_release_at) return new Date(order.auto_release_at);
  if (order.created_at)      return new Date(new Date(order.created_at).getTime() + 4 * 3600 * 1000);
  return null;
}

export default function DeliveryConfirmation({ order, onConfirmed, onDispute }) {
  const [timeLeft, setTimeLeft]     = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone]             = useState(false);

  const isPickup   = order.fulfillment === "pickup";
  const releaseAt  = getReleaseAt(order);

  useEffect(() => {
    if (!releaseAt) return;
    const tick = () => setTimeLeft(Math.max(0, releaseAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.auto_release_at, order.created_at]);

  const handleConfirm = async () => {
    setConfirming(true);
    const now = new Date().toISOString();
    await supabase.from("orders").update({
      status:           "completed",
      confirmed_at:     now,
      payment_released: true,
    }).eq("id", order.id);
    await supabase.from("escrow_ledger").update({
      status:      "released",
      released_at: now,
    }).eq("order_id", order.id);
    setConfirming(false);
    setDone(true);
    onConfirmed?.();
  };

  if (done) {
    return (
      <div style={{
        background: "#F0FDF4", border: "1.5px solid #BBF7D0",
        borderRadius: 14, padding: "18px 16px", marginTop: 12,
        textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#15803D" }}>
          Thank you for confirming!
        </div>
        <div style={{ fontSize: 12, color: "#16A34A", marginTop: 4, lineHeight: 1.5 }}>
          Enjoy your meal 🎉
        </div>
      </div>
    );
  }

  const countdown = timeLeft !== null ? formatCountdown(timeLeft) : null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFFBEB 0%, #FFF7ED 100%)",
      border: "1.5px solid #FCD34D",
      borderRadius: 16, padding: "16px", marginTop: 14,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxShadow: "0 2px 10px rgba(253,186,68,0.15)",
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "#FEF3C7", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18,
        }}>
          {isPickup ? "🏃" : "🛵"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>
            {isPickup ? "Have you picked up your order?" : "Your order has been delivered!"}
          </div>
          <div style={{ fontSize: 11, color: "#92400E", lineHeight: 1.4 }}>
            {isPickup
              ? "Please confirm once you've collected your food"
              : "Please confirm receipt or raise a dispute"}
          </div>
        </div>
      </div>

      {/* Countdown */}
      {countdown && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.7)", borderRadius: 10,
          padding: "8px 12px", marginBottom: 12, border: "1px solid #FDE68A",
        }}>
          <span style={{ fontSize: 14 }}>⏱️</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Auto-confirming in
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#B45309", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onDispute?.(order)}
          style={{
            flex: 1, padding: "11px",
            background: "#FEF2F2", color: "#DC2626",
            border: "1.5px solid #FECACA", borderRadius: 12,
            fontSize: 11, fontWeight: 800, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {isPickup ? "⚠️ There's a problem" : "⚠️ Dispute"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            flex: 2, padding: "11px",
            background: confirming ? "#D1FAE5" : "#16A34A",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 12, fontWeight: 800,
            cursor: confirming ? "default" : "pointer",
            opacity: confirming ? 0.8 : 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: "background 0.2s",
          }}
        >
          {confirming
            ? "Confirming..."
            : isPickup ? "✓ Yes, I got it" : "✓ Confirm Received"}
        </button>
      </div>
    </div>
  );
}
