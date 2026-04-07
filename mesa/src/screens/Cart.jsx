// src/screens/Cart.jsx

import { useState } from "react";
import { supabase } from "../lib/supabase";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const STATUS_COLORS = {
  pending:    { bg: "#FFFBEB", color: "#D97706" },
  confirmed:  { bg: "#EFF6FF", color: "#2563EB" },
  preparing:  { bg: "#FFF0ED", color: CORAL },
  ready:      { bg: "#F0FDF4", color: "#16A34A" },
  completed:  { bg: "#F3F4F6", color: "#6B7280" },
  cancelled:  { bg: "#FEF2F2", color: "#DC2626" },
};

const STATUS_LABELS = {
  pending:   "Order Received",
  confirmed: "Confirmed",
  preparing: "Being Prepared",
  ready:     "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function CartScreen({
  cart,           // useCart() result
  user,
  onClose,
  onSignIn,
  onOrderPlaced,
}) {
  const [step, setStep]               = useState("cart");   // cart | checkout | confirm
  const [fulfillment, setFulfillment] = useState("pickup"); // pickup | delivery
  const [payMethod, setPayMethod]     = useState("cash");   // cash | online
  const [address, setAddress]         = useState("");
  const [note, setNote]               = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const { items, restaurantName, subtotal, removeItem, addItem, clearCart, placeOrder, submitting, error } = cart;

  // Load Paystack script on demand
  async function loadPaystack() {
    if (window.PaystackPop) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function handlePlaceOrder() {
    if (!user) { onSignIn(); return; }

    const { data: order, error: err } = await placeOrder({
      fulfillment,
      paymentMethod: payMethod,
      deliveryAddress: address,
      note,
      userId: user.id,
    });

    if (err || !order) return;

    // Cash payment — go straight to Orders page
    if (payMethod !== "online") {
      if (onOrderPlaced) onOrderPlaced(order);
      else { setPlacedOrder(order); setStep("confirm"); }
      return;
    }

    // Online payment — open Paystack popup
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      // Key not configured — treat as unpaid and proceed
      if (onOrderPlaced) onOrderPlaced(order);
      else { setPlacedOrder(order); setStep("confirm"); }
      return;
    }

    try {
      await loadPaystack();
      const handler = window.PaystackPop.setup({
        key:      paystackKey,
        email:    user.email,
        amount:   Math.round(Number(order.subtotal) * 100), // naira → kobo
        currency: "NGN",
        ref:      `MESA-${order.id.slice(0, 8).toUpperCase()}-${Date.now()}`,
        metadata: {
          order_id:   order.id,
          restaurant: restaurantName,
        },
        callback: async (response) => {
          // Payment confirmed — update order record
          await supabase
            .from("orders")
            .update({ payment_status: "paid", paystack_reference: response.reference })
            .eq("id", order.id);
          if (onOrderPlaced) onOrderPlaced(order);
          else { setPlacedOrder(order); setStep("confirm"); }
        },
        onClose: () => {
          // User closed without paying — order exists as unpaid
          // Still navigate so they can see it and retry
          if (onOrderPlaced) onOrderPlaced(order);
          else { setPlacedOrder(order); setStep("confirm"); }
        },
      });
      handler.openIframe();
    } catch {
      // Paystack failed to load — fall through
      if (onOrderPlaced) onOrderPlaced(order);
    }
  }

  // ── CONFIRM screen ──────────────────────────────────────────
  if (step === "confirm" && placedOrder) {
    const sc = STATUS_COLORS[placedOrder.status] || STATUS_COLORS.pending;
    return (
      <Screen onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 28px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 8 }}>Order Placed!</div>
          <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
            Your order has been sent to <strong>{restaurantName}</strong>.
            They'll confirm it shortly.
          </div>

          <div style={{ width: "100%", background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Order ID</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{placedOrder.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Fulfillment</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{fulfillment === "pickup" ? "I'll pick up" : "Delivery"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Payment</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{payMethod === "cash" ? "Cash" : "Online (Paystack)"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: CORAL }}>₦{Number(subtotal || placedOrder.subtotal).toLocaleString()}</span>
            </div>
          </div>

          <div style={{ background: sc.bg, color: sc.color, fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 20, marginBottom: 28 }}>
            Status: {STATUS_LABELS[placedOrder.status]}
          </div>

          {payMethod === "online" && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 14, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#92400E", lineHeight: 1.7, textAlign: "left" }}>
              💳 Paystack integration coming in Stage 2. For now your order is confirmed — please arrange payment directly with the restaurant.
            </div>
          )}

          <button onClick={onClose} style={btnStyle}>Done</button>
        </div>
      </Screen>
    );
  }

  // ── CHECKOUT screen ─────────────────────────────────────────
  if (step === "checkout") {
    return (
      <Screen onClose={() => setStep("cart")} title="Checkout" backLabel="← Edit cart">
        <div style={{ padding: "0 20px 120px" }}>

          {/* Fulfillment */}
          <SectionLabel>How do you want your order?</SectionLabel>
          <OptionPair
            options={[
              { id: "pickup",   label: "🏃 Pick up myself", sub: "I'll come collect it" },
              { id: "delivery", label: "🛵 Delivery",        sub: "Restaurant delivers to me" },
            ]}
            value={fulfillment}
            onChange={setFulfillment}
          />

          {fulfillment === "delivery" && (
            <div style={{ marginTop: 12 }}>
              <SectionLabel>Delivery address</SectionLabel>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter your full delivery address..."
                style={taStyle}
              />
            </div>
          )}

          {/* Payment */}
          <SectionLabel>How do you want to pay?</SectionLabel>
          <OptionPair
            options={[
              { id: "cash",   label: "💵 Cash",   sub: fulfillment === "pickup" ? "Pay when you collect" : "Pay on delivery" },
              { id: "online", label: "💳 Online",  sub: "Pay now via Paystack" },
            ]}
            value={payMethod}
            onChange={setPayMethod}
          />

          {payMethod === "online" && (
            <div style={{ marginTop: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 14px", fontSize: 11, color: "#92400E" }}>
              Online payments via Paystack coming soon. Your order will be placed and the restaurant will confirm before you pay.
            </div>
          )}

          {/* Order note */}
          <SectionLabel>Any special instructions?</SectionLabel>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 200))}
            placeholder="No pepper, extra sauce, etc. (optional)"
            style={{ ...taStyle, minHeight: 70 }}
          />
          <div style={{ fontSize: 10, color: "#C0C0C0", marginTop: 4, textAlign: "right" }}>{note.length}/200</div>

          {/* Order summary */}
          <SectionLabel>Order summary</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", overflow: "hidden" }}>
            {items.map(i => (
              <div key={i.menuItem.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #F7F5F2" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{i.menuItem.name}</span>
                <span style={{ fontSize: 12, color: "#888" }}>x{i.quantity}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: CORAL }}>₦{Number(i.menuItem.price * i.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: DARK }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: CORAL }}>₦{Number(subtotal).toLocaleString()}</span>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, background: "#FFF0ED", color: CORAL, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 12 }}>{error}</div>}
        </div>

        {/* Sticky footer */}
        <div style={footerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#888" }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: CORAL }}>₦{Number(subtotal).toLocaleString()}</span>
          </div>
          <button disabled={submitting || (fulfillment === "delivery" && !address.trim())} onClick={handlePlaceOrder} style={{ ...btnStyle, opacity: (submitting || (fulfillment === "delivery" && !address.trim())) ? 0.5 : 1 }}>
            {submitting ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </Screen>
    );
  }

  // ── CART screen ─────────────────────────────────────────────
  if (!items.length) {
    return (
      <Screen onClose={onClose} title="Cart">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8 }}>Your cart is empty</div>
          <div style={{ fontSize: 14, color: "#888" }}>Browse restaurants and add items to your cart.</div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen onClose={onClose} title="Your Cart">
      <div style={{ padding: "0 20px 140px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 14 }}>From: {restaurantName}</div>

        {items.map(i => (
          <div key={i.menuItem.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>{i.menuItem.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: CORAL }}>₦{Number(i.menuItem.price).toLocaleString()}</div>
            </div>
            {/* Quantity control */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => removeItem(i.menuItem.id)} style={qBtnStyle}>−</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: DARK, minWidth: 18, textAlign: "center" }}>{i.quantity}</span>
              <button onClick={() => addItem(i.menuItem, { id: cart.restaurantId, name: restaurantName })} style={{ ...qBtnStyle, background: CORAL, color: "#fff", border: "none" }}>+</button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: DARK, minWidth: 70, textAlign: "right" }}>₦{Number(i.menuItem.price * i.quantity).toLocaleString()}</div>
          </div>
        ))}

        <button onClick={clearCart} style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, background: "transparent", border: "none", cursor: "pointer", padding: "8px 0", display: "block" }}>Clear cart</button>
      </div>

      <div style={footerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#888" }}>{items.reduce((s, i) => s + i.quantity, 0)} items</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: CORAL }}>₦{Number(subtotal).toLocaleString()}</span>
        </div>
        <button onClick={() => setStep("checkout")} style={btnStyle}>
          Continue to Checkout →
        </button>
      </div>
    </Screen>
  );
}

// ── Reservation Screen ───────────────────────────────────────
export function ReservationScreen({ restaurant, user, onClose, onSignIn, makeReservation, submitting, error: resError }) {
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [party, setParty]     = useState(2);
  const [note, setNote]       = useState("");
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

  const minDate = new Date().toISOString().split("T")[0];

  async function submit(e) {
    e.preventDefault();
    if (!user) { onSignIn(); return; }
    if (!date || !time) { setErr("Please pick a date and time"); return; }
    setErr("");

    const reservedAt = new Date(`${date}T${time}`).toISOString();
    const { error } = await makeReservation({
      restaurantId:  restaurant.id,
      reservedAt,
      partySize:     party,
      preOrderNote:  note,
    });

    if (!error) setDone(true);
    else setErr(error);
  }

  if (done) {
    return (
      <Screen onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>📅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 8 }}>Reservation Sent!</div>
          <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
            Your request has been sent to <strong>{restaurant.name}</strong>.
            They'll confirm your booking shortly.
          </div>
          <div style={{ background: "#EFF6FF", color: "#2563EB", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 20, marginBottom: 28 }}>
            {new Date(`${date}T${time}`).toLocaleString("en-NG", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {party} {party === 1 ? "person" : "people"}
          </div>
          <button onClick={onClose} style={btnStyle}>Done</button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen onClose={onClose} title={`Reserve at ${restaurant.name}`}>
      <form onSubmit={submit} style={{ padding: "0 20px 32px" }}>

        {/* Date + Time */}
        <SectionLabel>When do you want to arrive?</SectionLabel>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Date</div>
            <input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Time</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} required style={inputStyle} />
          </div>
        </div>

        {/* Party size */}
        <SectionLabel>How many people?</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <button type="button" onClick={() => setParty(Math.max(1, party - 1))} style={qBtnStyle}>−</button>
          <span style={{ fontSize: 22, fontWeight: 800, color: DARK, minWidth: 32, textAlign: "center" }}>{party}</span>
          <button type="button" onClick={() => setParty(Math.min(20, party + 1))} style={{ ...qBtnStyle, background: CORAL, color: "#fff", border: "none" }}>+</button>
          <span style={{ fontSize: 13, color: "#888" }}>{party === 1 ? "person" : "people"}</span>
        </div>

        {/* Pre-order note */}
        <SectionLabel>Any food you'd like pre-prepared? (optional)</SectionLabel>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 300))}
          placeholder="e.g. 'Please have jollof rice and pepper soup ready' or 'Window table preferred'"
          style={{ ...taStyle, minHeight: 90 }}
        />
        <div style={{ fontSize: 10, color: "#C0C0C0", textAlign: "right", marginTop: 4 }}>{note.length}/300</div>

        {(err || resError) && (
          <div style={{ background: "#FFF0ED", color: CORAL, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 12, marginBottom: 16 }}>
            {err || resError}
          </div>
        )}

        {!user && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#92400E", marginBottom: 16 }}>
            You need to sign in to make a reservation.
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ ...btnStyle, marginTop: 8, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Sending..." : user ? "Request Reservation" : "Sign In to Reserve"}
        </button>
      </form>
    </Screen>
  );
}

// ── Shared sub-components ─────────────────────────────────────
function Screen({ children, onClose, title, backLabel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 200, maxWidth: 430, margin: "0 auto", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #F0EDE8", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: "#F5F5F5", border: "none", borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>←</button>
        {title && <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>{backLabel || title}</div>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 10, marginTop: 20 }}>{children}</div>;
}

function OptionPair({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {options.map(opt => (
        <div key={opt.id} onClick={() => onChange(opt.id)}
          style={{ flex: 1, background: value === opt.id ? "#FFF0ED" : "#fff", border: `2px solid ${value === opt.id ? CORAL : "#EBEBEB"}`, borderRadius: 16, padding: "14px 12px", cursor: "pointer", transition: "all 0.2s" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: value === opt.id ? CORAL : DARK, marginBottom: 3 }}>{opt.label}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{opt.sub}</div>
        </div>
      ))}
    </div>
  );
}

// Shared styles
const btnStyle = {
  width: "100%", padding: "16px", background: CORAL, color: "#fff",
  border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800,
  cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const footerStyle = {
  position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
  width: "100%", maxWidth: 430, background: "#fff",
  borderTop: "1px solid #F0EDE8", padding: "16px 20px",
  paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
};
const qBtnStyle = {
  width: 32, height: 32, borderRadius: 10, border: "1.5px solid #EBEBEB",
  background: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Plus Jakarta Sans', sans-serif", color: DARK,
};
const taStyle = {
  width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 14,
  background: "#fff", outline: "none", fontSize: 14, color: DARK,
  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
  padding: "12px 14px", lineHeight: 1.6, minHeight: 80, resize: "none",
};
const inputStyle = {
  width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12,
  background: "#F9F9F9", outline: "none", fontSize: 14, color: DARK,
  fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "12px 14px",
};
