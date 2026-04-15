// src/screens/Cart.jsx
import { useState, useEffect } from "react";
import PaystackPop from "@paystack/inline-js";
import { supabase } from "../lib/supabase";
import { validatePromoCode } from "../hooks/usePromoCodes";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

// ── Reservation Screen ───────────────────────────────────────
export function ReservationScreen({ restaurant, user, onClose, onSignIn, makeReservation, submitting, error }) {
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [party, setParty]     = useState(2);
  const [note, setNote]       = useState("");
  const [done, setDone]       = useState(false);

  async function submit() {
    if (!user) { onSignIn(); return; }
    if (!date || !time) return;
    const reservedAt = new Date(`${date}T${time}`).toISOString();
    const { error: err } = await makeReservation({
      restaurantId: restaurant.id,
      reservedAt,
      partySize: party,
      preOrderNote: note,
    });
    if (!err) setDone(true);
  }

  if (done) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "40px 24px 48px", width: "100%", textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Reservation sent!</div>
        <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
          {restaurant.name} will confirm shortly. Check your reservations in your profile.
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: 14, background: CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxHeight: "90vh", overflowY: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: DARK }}>Reserve a Table</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: BG, border: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 16 }}>{restaurant.name}</div>

        {[
          { label: "Date", type: "date", val: date, set: setDate },
          { label: "Time", type: "time", val: time, set: setTime },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>{f.label}</div>
            <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>Party size</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setParty(p => Math.max(1, p - 1))} style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #EBEBEB", background: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 18, fontWeight: 800, color: DARK, minWidth: 30, textAlign: "center" }}>{party}</span>
            <button onClick={() => setParty(p => Math.min(20, p + 1))} style={{ width: 36, height: 36, borderRadius: 10, background: CORAL, border: "none", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>+</button>
            <span style={{ fontSize: 13, color: "#888" }}>{party === 1 ? "person" : "people"}</span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>Pre-order note (optional)</div>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 200))}
            placeholder="Any food you'd like ready when you arrive..."
            style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 13, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", minHeight: 72 }} />
        </div>

        {error && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 12, padding: "8px 12px", background: "#FEF2F2", borderRadius: 10 }}>{error}</div>}

        <button onClick={submit} disabled={submitting || !date || !time}
          style={{ width: "100%", padding: 14, background: !date || !time ? "#E0E0E0" : CORAL, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: !date || !time ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {submitting ? "Sending..." : "Request Reservation"}
        </button>
      </div>
    </div>
  );
}


// ── Cart Screen ───────────────────────────────────────────────
export default function CartScreen({ cart, user, onClose, onSignIn, onOrderPlaced, acceptsOnline = true, acceptsCash = true }) {
  const [fulfillment, setFulfillment]   = useState("pickup");
  const [orderSuccess, setOrderSuccess] = useState(null); // { orderId, method }
  const [paymentMethod, setPaymentMethod] = useState(
    acceptsCash ? "cash" : "online"  // default to cash if available, else online
  );
  const [address, setAddress]           = useState("");
  const [note, setNote]                 = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderErr, setOrderErr]         = useState("");
  const [schedMode, setSchedMode]       = useState("now");   // "now" | "schedule"
  const [schedDate, setSchedDate]       = useState("today"); // "today" | "tomorrow"
  const [schedTime, setSchedTime]       = useState("");      // "HH:MM"

  // ── Promo code ──────────────────────────────────────────────
  const [promoInput, setPromoInput]     = useState("");
  const [promoResult, setPromoResult]   = useState(null); // { valid, promo, discount } | null
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoErr, setPromoErr]         = useState("");

  // ── Loyalty points ──────────────────────────────────────────
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);

  useEffect(() => {
    if (!user || !cart.restaurantId) return;
    supabase
      .from("loyalty_points")
      .select("points")
      .eq("customer_id", user.id)
      .eq("restaurant_id", cart.restaurantId)
      .maybeSingle()
      .then(({ data }) => setLoyaltyPoints(data?.points || 0));
  }, [user?.id, cart.restaurantId]);

  // If only one payment method is available, lock to it
  const lockedPayment = acceptsOnline && !acceptsCash ? "online"
                      : !acceptsOnline && acceptsCash  ? "cash"
                      : null; // both available — let customer choose

  const effectivePayment = lockedPayment || paymentMethod;

  const subtotal = cart.subtotal; // original price before discounts

  // ── Promo code helpers ───────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoErr("");
    setPromoResult(null);
    const result = await validatePromoCode(promoInput, cart.restaurantId, subtotal);
    setPromoLoading(false);
    if (!result.valid) { setPromoErr(result.reason); return; }
    setPromoResult(result);
    setPromoInput("");
  }

  const promoDiscount   = promoResult?.discount  || 0;
  const loyaltyDiscount = redeemLoyalty ? 500 : 0;
  const totalDiscount   = promoDiscount + loyaltyDiscount;
  const finalTotal      = Math.max(0, subtotal - totalDiscount);

  // ── Scheduling helpers ────────────────────────────────────
  function getTimeSlots(dateKey) {
    const now = new Date();
    const minMinutes = now.getHours() * 60 + now.getMinutes() + 30;
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        if (dateKey === "today" && h * 60 + m < minMinutes) continue;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }

  function fmtSlot(t) {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return m === 0 ? `${h12}:00 ${suffix}` : `${h12}:30 ${suffix}`;
  }

  function getScheduledTime() {
    if (schedMode !== "schedule" || !schedTime) return null;
    const base = new Date();
    if (schedDate === "tomorrow") base.setDate(base.getDate() + 1);
    const dateStr = base.toISOString().slice(0, 10);
    return new Date(`${dateStr}T${schedTime}`).toISOString();
  }

  const schedLabel = schedMode === "schedule" && schedTime
    ? `${schedDate === "today" ? "Today" : "Tomorrow"} at ${fmtSlot(schedTime)}`
    : null;

  function handlePlaceOrder() {
    if (!user) { onSignIn(); return; }
    if (fulfillment === "delivery" && !address.trim()) {
      setOrderErr("Please enter a delivery address"); return;
    }
    if (schedMode === "schedule" && !schedTime) {
      setOrderErr("Please select a scheduled time"); return;
    }
    if (redeemLoyalty && loyaltyPoints < 100) {
      setRedeemLoyalty(false);
    }
    if (!acceptsOnline && !acceptsCash) {
      setOrderErr("This restaurant has no payment methods enabled"); return;
    }
    setOrderErr("");

    if (effectivePayment === "online") {
      // Open Paystack IMMEDIATELY — must be synchronous from user click
      // Browser blocks popups if there's any async before this point
      const ref = `chowli-${Date.now()}`;
      const snapFulfillment = fulfillment;
      const snapAddress     = address;
      const snapNote        = note;
      const snapUserId      = user.id;

      setPlacingOrder(true);

      const snapScheduledTime = getScheduledTime();
      const snapPromoCode     = promoResult?.promo?.code || null;
      const snapDiscountAmt   = totalDiscount;
      const snapRedeemLoyalty = redeemLoyalty;

      new PaystackPop().newTransaction({
        key:      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email:    user.email,
        amount:   Math.max(0, finalTotal) * 100,
        currency: "NGN",
        ref,
        onSuccess: function(response) {
          // Paystack v1 requires a regular function — not async
          // Handle async work inside a plain promise
          cart.placeOrder({
            fulfillment:       snapFulfillment,
            paymentMethod:     "online",
            deliveryAddress:   snapAddress,
            note:              snapNote,
            userId:            snapUserId,
            paystackReference: response.reference,
            scheduledTime:     snapScheduledTime,
            promoCode:         snapPromoCode,
            discountAmount:    snapDiscountAmt,
            redeemLoyalty:     snapRedeemLoyalty,
          }).then(function(result) {
            setPlacingOrder(false);
            if (result.error) { setOrderErr(result.error); return; }
            setOrderSuccess({ orderId: result.data?.id, method: "online" });
          });
        },
        onCancel: function() {
          setPlacingOrder(false);
        },
      });
    } else {
      // Cash order — use async IIFE since outer function is sync
      setPlacingOrder(true);
      (async () => {
        const { data, error } = await cart.placeOrder({
          fulfillment,
          paymentMethod:  "cash",
          deliveryAddress: address,
          note,
          userId:         user.id,
          scheduledTime:  getScheduledTime(),
          promoCode:      promoResult?.promo?.code || null,
          discountAmount: totalDiscount,
          redeemLoyalty,
        });
        setPlacingOrder(false);
        if (error) { setOrderErr(error); return; }
        setOrderSuccess({ orderId: data?.id, method: "cash" });
      })();
    }
  }

  // ── Order success screen ──────────────────────────────────
  if (orderSuccess) return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ fontSize: 64, marginBottom: 20, animation: "successPop 0.5s cubic-bezier(.36,.07,.19,.97) both" }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: DARK, marginBottom: 10 }}>Order placed!</div>
      <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 8 }}>
        {orderSuccess.method === "online"
          ? "Your payment was successful. The restaurant has been notified."
          : "Your order has been sent to the restaurant. Pay when you pick up or receive delivery."}
      </div>
      <div style={{ fontSize: 11, color: "#B0B0B0", marginBottom: 32 }}>
        Order #{orderSuccess.orderId?.slice(0, 8).toUpperCase()}
      </div>
      <button onClick={() => onOrderPlaced({ id: orderSuccess.orderId })}
        style={{ width: "100%", padding: 16, background: CORAL, color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Track My Order
      </button>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 200, maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 16px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: BG, border: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: DARK }}>Your Cart</div>
        {cart.restaurantName && <div style={{ fontSize: 12, color: "#888", marginLeft: "auto" }}>{cart.restaurantName}</div>}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

        {/* Cart items */}
        {cart.items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6 }}>Your cart is empty</div>
            <div style={{ fontSize: 13, color: "#B0B0B0" }}>Add items from a restaurant to get started</div>
          </div>
        ) : (
          <>
            <div style={{ background: BG, borderRadius: 16, padding: "4px 0", marginBottom: 16 }}>
              {cart.items.map(({ menuItem, quantity }) => (
                <div key={menuItem.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid #EBEBEB" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>{menuItem.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: CORAL }}>₦{Number(menuItem.price).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => cart.removeItem(menuItem.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #EBEBEB", background: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 800, color: DARK, minWidth: 18, textAlign: "center" }}>{quantity}</span>
                    <button onClick={() => cart.addItem(menuItem, { id: cart.restaurantId, name: cart.restaurantName })} style={{ width: 28, height: 28, borderRadius: 8, background: CORAL, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: DARK, minWidth: 64, textAlign: "right", flexShrink: 0 }}>
                    ₦{Number(menuItem.price * quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Fulfillment */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>How do you want it?</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { id: "pickup", label: "🏃 Pickup", sub: "Come get it" },
                  { id: "delivery", label: "🛵 Delivery", sub: "Bring it to me" },
                ].map(f => (
                  <button key={f.id} onClick={() => setFulfillment(f.id)}
                    style={{ flex: 1, padding: "12px 10px", borderRadius: 14, border: `2px solid ${fulfillment === f.id ? CORAL : "#EBEBEB"}`, background: fulfillment === f.id ? "#FFF0ED" : "#fff", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: fulfillment === f.id ? CORAL : DARK }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduling */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>When do you want it?</div>
              <div style={{ display: "flex", gap: 10, marginBottom: schedMode === "schedule" ? 12 : 0 }}>
                {[
                  { id: "now",      label: "⚡ Now",      sub: "ASAP" },
                  { id: "schedule", label: "⏰ Schedule", sub: "Pick a time" },
                ].map(w => (
                  <button key={w.id} onClick={() => setSchedMode(w.id)}
                    style={{ flex: 1, padding: "12px 10px", borderRadius: 14, border: `2px solid ${schedMode === w.id ? CORAL : "#EBEBEB"}`, background: schedMode === w.id ? "#FFF0ED" : "#fff", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: schedMode === w.id ? CORAL : DARK }}>{w.label}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{w.sub}</div>
                  </button>
                ))}
              </div>
              {schedMode === "schedule" && (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <select value={schedDate} onChange={e => { setSchedDate(e.target.value); setSchedTime(""); }}
                      style={{ flex: 1, border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", appearance: "none" }}>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                    </select>
                    <select value={schedTime} onChange={e => setSchedTime(e.target.value)}
                      style={{ flex: 1, border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: schedTime ? DARK : "#B0B0B0", padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", appearance: "none" }}>
                      <option value="">Pick time...</option>
                      {getTimeSlots(schedDate).map(t => (
                        <option key={t} value={t}>{fmtSlot(t)}</option>
                      ))}
                    </select>
                  </div>
                  {schedLabel && (
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: CORAL, textAlign: "center", padding: "8px 0", background: "#FFF0ED", borderRadius: 10 }}>
                      Scheduled for: {schedLabel}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Delivery address */}
            {fulfillment === "delivery" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Delivery address</div>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
              </div>
            )}

            {/* Payment method — only show options the restaurant accepts */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Payment</div>

              {/* Neither method available */}
              {!acceptsOnline && !acceptsCash && (
                <div style={{ padding: "12px 14px", background: "#FEF2F2", borderRadius: 14, fontSize: 13, color: "#DC2626", fontWeight: 600 }}>
                  ⚠️ This restaurant hasn't set up payment methods yet. Contact them directly.
                </div>
              )}

              {/* Only one method — show as locked */}
              {lockedPayment && (
                <div style={{ padding: "14px 16px", background: "#F7F5F2", borderRadius: 14, border: "2px solid #EBEBEB", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{lockedPayment === "online" ? "💳" : "💵"}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{lockedPayment === "online" ? "Online payment" : "Cash payment"}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{lockedPayment === "online" ? "Pay securely with card" : "Pay on pickup or delivery"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#888", background: "#EBEBEB", padding: "3px 10px", borderRadius: 20 }}>Only option</div>
                </div>
              )}

              {/* Both available — let customer choose */}
              {!lockedPayment && (
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { id: "cash", label: "💵 Cash", sub: "Pay on pickup/delivery" },
                    { id: "online", label: "💳 Card", sub: "Pay now via Paystack" },
                  ].map(p => (
                    <button key={p.id} onClick={() => setPaymentMethod(p.id)}
                      style={{ flex: 1, padding: "12px 10px", borderRadius: 14, border: `2px solid ${effectivePayment === p.id ? CORAL : "#EBEBEB"}`, background: effectivePayment === p.id ? "#FFF0ED" : "#fff", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: effectivePayment === p.id ? CORAL : DARK }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{p.sub}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Special note */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Special instructions (optional)</div>
              <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 200))}
                placeholder="Any requests or allergies..."
                style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 13, color: DARK, padding: "12px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", minHeight: 64 }} />
            </div>

            {/* Promo Code */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Promo Code</div>
              {promoResult?.valid ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12 }}>
                  <span style={{ fontSize: 14 }}>🎉</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{promoResult.promo.code} applied!</div>
                    <div style={{ fontSize: 11, color: "#16A34A" }}>
                      {promoResult.promo.discount_type === "percent"
                        ? `${promoResult.promo.discount_value}% off`
                        : `₦${Number(promoResult.promo.discount_value).toLocaleString()} off`}
                      {" — saving ₦"}{Number(promoDiscount).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => { setPromoResult(null); setPromoInput(""); }} style={{ fontSize: 13, color: "#DC2626", background: "transparent", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoErr(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleApplyPromo(); }}
                    placeholder="Enter code..."
                    style={{ flex: 1, border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 14, color: DARK, padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    style={{ padding: "10px 18px", background: promoInput.trim() ? CORAL : "#E0E0E0", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: promoInput.trim() ? "pointer" : "default" }}>
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {promoErr && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, marginTop: 6 }}>{promoErr}</div>}
            </div>

            {/* Loyalty Points */}
            {loyaltyPoints > 0 && (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: redeemLoyalty ? "#EDE9FE" : BG, border: `1.5px solid ${redeemLoyalty ? "#A78BFA" : "#EBEBEB"}`, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: redeemLoyalty ? "#7C3AED" : DARK }}>
                      ⭐ {loyaltyPoints} points at this restaurant
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {loyaltyPoints >= 100
                        ? "Redeem 100 points for ₦500 off this order"
                        : `${100 - loyaltyPoints} more points to unlock ₦500 discount`}
                    </div>
                  </div>
                  {loyaltyPoints >= 100 && (
                    <button
                      onClick={() => setRedeemLoyalty(v => !v)}
                      style={{ padding: "6px 14px", background: redeemLoyalty ? "#7C3AED" : "#fff", color: redeemLoyalty ? "#fff" : "#7C3AED", border: "1.5px solid #7C3AED", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {redeemLoyalty ? "✓ Applied" : "Redeem"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div style={{ background: BG, borderRadius: 16, padding: "14px 16px", marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#888" }}>Subtotal ({cart.totalItems} items)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>₦{Number(subtotal).toLocaleString()}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#16A34A" }}>Discount</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>−₦{Number(totalDiscount).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: DARK }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: CORAL }}>₦{Number(finalTotal).toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Place order button */}
      {cart.items.length > 0 && (
        <div style={{ padding: "14px 20px", paddingBottom: "calc(14px + env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #F0EDE8" }}>
          {orderErr && <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginBottom: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 10 }}>{orderErr}</div>}
          <button onClick={handlePlaceOrder} disabled={placingOrder || (!acceptsOnline && !acceptsCash)}
            style={{ width: "100%", padding: 16, background: placingOrder || (!acceptsOnline && !acceptsCash) ? "#C0C0C0" : CORAL, color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: placingOrder ? "wait" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {placingOrder ? "Processing..." : effectivePayment === "online" ? `Pay ₦${Number(finalTotal).toLocaleString()} with Card` : `Place Order — Pay ₦${Number(finalTotal).toLocaleString()} in Cash`}
          </button>
        </div>
      )}
    </div>
  );
}
