// src/components/DeliveryConfirmation.jsx
// Shown on the customer's order card when status = 'delivered' and confirmed_at is null.
// Customer can confirm receipt (releases escrow) or raise a dispute.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const DARK = "#1C1C1E";

function formatCountdown(ms) {
  if (ms <= 0) return "0:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DeliveryConfirmation({ order, onConfirmed, onDispute }) {
  const [timeLeft, setTimeLeft]   = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    if (!order.auto_release_at) return;
    const tick = () => setTimeLeft(Math.max(0, new Date(order.auto_release_at) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.auto_release_at]);

  const handleConfirm = async () => {
    setConfirming(true);
    const now = new Date().toISOString();
    await supabase.from("orders").update({
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
      <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: "16px", marginTop: 12, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>Thanks for confirming!</div>
        <div style={{ fontSize: 12, color: "#86EFAC", marginTop: 4 }}>Your feedback helps keep Chowli great.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #F0EDE8", borderRadius: 14, padding: "16px", marginTop: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 4 }}>Order Delivered 🛵</div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>
        Confirm receipt or raise a dispute if something went wrong.
      </div>

      {timeLeft !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, background: "#FFFBEB", borderRadius: 10, padding: "9px 12px" }}>
          <span style={{ fontSize: 16 }}>⏱️</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Auto-confirming in
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#D97706", fontVariantNumeric: "tabular-nums" }}>
              {formatCountdown(timeLeft)}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onDispute?.(order)}
          style={{ flex: 1, padding: "11px", background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          ⚠️ Dispute
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming}
          style={{ flex: 2, padding: "11px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: confirming ? "default" : "pointer", opacity: confirming ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {confirming ? "Confirming..." : "✓ Confirm Received"}
        </button>
      </div>
    </div>
  );
}
