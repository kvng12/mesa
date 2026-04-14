// src/screens/OrdersPage.jsx
// Customer order history with realtime status updates.
// Structured to be future-ready for tracking, reorder, and payment history.

import { useOrders } from "../hooks/useOrders";

const CORAL = "#FF6240";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

// ── Status config ─────────────────────────────────────────────
// Future: add icon, step number, estimated time per status
const STATUS = {
  pending:   { label: "Order Received", color: "#888888",  bg: "#F3F4F6", icon: "🕐", step: 1 },
  confirmed: { label: "Confirmed",      color: "#2563EB",  bg: "#EFF6FF", icon: "✅", step: 2 },
  preparing: { label: "Preparing",      color: "#D97706",  bg: "#FFFBEB", icon: "👨‍🍳", step: 3 },
  ready:     { label: "Ready",          color: "#16A34A",  bg: "#F0FDF4", icon: "🔔", step: 4 },
  completed: { label: "Completed",      color: "#6B7280",  bg: "#F3F4F6", icon: "✓",  step: 5 },
  delivered: { label: "Delivered",      color: "#16A34A",  bg: "#F0FDF4", icon: "🛵", step: 5 },
  cancelled: { label: "Cancelled",      color: "#DC2626",  bg: "#FEF2F2", icon: "✕",  step: 0 },
};

const FULFILLMENT = {
  pickup:   "🏃 Pick up",
  delivery: "🛵 Delivery",
};

const PAYMENT = {
  cash:   "💵 Cash",
  online: "💳 Online",
};

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + `, ${time}`;
}

function shortId(id) {
  return id.slice(0, 8).toUpperCase();
}

// ── Progress dots ─────────────────────────────────────────────
// Future: expand into a full tracking timeline with timestamps
function StatusProgress({ status, fulfillment }) {
  if (status === "cancelled") return null;
  // Delivery orders show "delivered" as final step; pickup shows "completed"
  const steps = fulfillment === "delivery"
    ? ["pending", "confirmed", "preparing", "ready", "delivered"]
    : ["pending", "confirmed", "preparing", "ready", "completed"];
  const currentStep = STATUS[status]?.step ?? 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "12px 0 4px" }}>
      {steps.map((s, i) => {
        const stepVal = STATUS[s]?.step ?? 1;
        const done    = stepVal <= currentStep;
        const isNow   = s === status;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{
              width: isNow ? 10 : 8,
              height: isNow ? 10 : 8,
              borderRadius: "50%",
              background: done ? (isNow ? CORAL : "#16A34A") : "#E0E0E0",
              flexShrink: 0,
              transition: "all 0.3s",
              boxShadow: isNow ? `0 0 0 3px #FFF0ED` : "none",
            }} />
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: STATUS[steps[i + 1]]?.step <= currentStep ? "#16A34A" : "#E0E0E0", transition: "background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Single order card ─────────────────────────────────────────
function OrderCard({ order, onReview, reviewedOrderIds, onReorder }) {
  const r  = order.restaurants;
  const sc = STATUS[order.status] || STATUS.pending;
  const items = order.order_items || [];

  return (
    <div style={{
      background: "#fff",
      borderRadius: 20,
      border: "1px solid #F0EDE8",
      overflow: "hidden",
      marginBottom: 12,
    }}>
      {/* Coloured top strip */}
      <div style={{ height: 4, background: sc.color, transition: "background 0.3s" }} />

      <div style={{ padding: "16px 16px 18px" }}>

        {/* Header row: restaurant + status badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          {r && (
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${r.bg_from || "#7C2D12"}, ${r.bg_to || "#C2410C"})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              {r.icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r?.name || "Restaurant"}
            </div>
            <div style={{ fontSize: 11, color: "#B0B0B0", fontWeight: 500 }}>
              #{shortId(order.id)} · {formatDate(order.created_at)}
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: sc.bg, color: sc.color,
            fontSize: 10, fontWeight: 700,
            padding: "4px 10px", borderRadius: 20, flexShrink: 0,
            transition: "all 0.3s",
          }}>
            <span>{sc.icon}</span>
            <span>{sc.label}</span>
          </div>
        </div>

        {/* Progress bar (not shown for cancelled) */}
        {order.status !== "cancelled" && <StatusProgress status={order.status} fulfillment={order.fulfillment} />}

        {/* Divider */}
        <div style={{ height: 1, background: "#F5F5F5", margin: "12px 0" }} />

        {/* Items list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: CORAL, borderRadius: 6, padding: "1px 6px", minWidth: 20, textAlign: "center" }}>
                  {item.quantity}
                </span>
                <span style={{ fontSize: 13, color: DARK, fontWeight: 500 }}>{item.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>
                ₦{Number(item.line_total ?? item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#F5F5F5", marginBottom: 12 }} />

        {/* Footer: fulfillment · payment · total */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888", background: BG, padding: "3px 8px", borderRadius: 8 }}>
              {FULFILLMENT[order.fulfillment] || order.fulfillment}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888", background: BG, padding: "3px 8px", borderRadius: 8 }}>
              {PAYMENT[order.payment_method] || order.payment_method}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: CORAL }}>
            ₦{Number(order.subtotal).toLocaleString()}
          </div>
        </div>

        {/* Delivery address (if applicable) */}
        {order.fulfillment === "delivery" && order.delivery_address && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#888", background: BG, borderRadius: 8, padding: "6px 10px" }}>
            📍 {order.delivery_address}
          </div>
        )}

        {/* Customer note */}
        {order.note && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#888", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 10px" }}>
            📝 {order.note}
          </div>
        )}

        {/* Review button — only for completed, unreviewed orders */}
        {(order.status === "completed" || order.status === "delivered") && onReview && !reviewedOrderIds.has(order.id) && (
          <button
            onClick={() => onReview(order)}
            style={{
              width: "100%", marginTop: 12, padding: "11px",
              background: "#FFF0ED", color: CORAL,
              border: "1.5px solid #FFD0C0", borderRadius: 12,
              fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            ⭐ Rate this order
          </button>
        )}
        {(order.status === "completed" || order.status === "delivered") && reviewedOrderIds.has(order.id) && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#16A34A", fontWeight: 700, textAlign: "center" }}>
            ✓ Reviewed — thank you!
          </div>
        )}
        {/* Reorder button — completed orders only */}
        {(order.status === "completed" || order.status === "delivered") && onReorder && (
          <button
            onClick={() => onReorder(order)}
            style={{
              width: "100%", marginTop: 10, padding: "11px",
              background: "#F7F5F2", color: DARK,
              border: "1.5px solid #EBEBEB", borderRadius: 12,
              fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            🔄 Reorder
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ onBrowse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "0 32px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🧾</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>No orders yet</div>
      <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: 28 }}>
        Your orders will appear here once you place one. Browse restaurants to get started.
      </div>
      <button
        onClick={onBrowse}
        style={{
          background: CORAL, color: "#fff", border: "none",
          borderRadius: 16, padding: "14px 32px",
          fontSize: 15, fontWeight: 800, cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Browse Restaurants
      </button>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 20px" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: "16px", height: 160 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EDE8" }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, background: "#F0EDE8", borderRadius: 6, marginBottom: 8, width: "60%" }} />
              <div style={{ height: 10, background: "#F0EDE8", borderRadius: 6, width: "40%" }} />
            </div>
          </div>
          <div style={{ height: 8, background: "#F0EDE8", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, background: "#F0EDE8", borderRadius: 4, width: "70%", marginBottom: 8 }} />
          <div style={{ height: 8, background: "#F0EDE8", borderRadius: 4, width: "50%" }} />
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ORDERS PAGE
// ════════════════════════════════════════════════════════════
export default function OrdersPage({ user, onBrowse, onReview, reviewedOrderIds = new Set(), onReorder }) {
  const { orders, loading, error, refetch } = useOrders(user?.id);

  // Group orders into active (non-final) and past (completed/cancelled)
  const activeOrders = orders.filter(o => !["completed", "cancelled", "delivered"].includes(o.status));
  const pastOrders   = orders.filter(o =>  ["completed", "cancelled", "delivered"].includes(o.status));

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}>

      {/* Header */}
      <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 18px", borderBottom: "1px solid #F0EDE8", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 2 }}>My Orders</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {loading ? "Loading..." : `${orders.length} order${orders.length !== 1 ? "s" : ""} total`}
            </div>
          </div>
          {!loading && orders.length > 0 && (
            <button
              onClick={refetch}
              style={{ background: BG, border: "1px solid #EBEBEB", borderRadius: 12, padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#888", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ paddingTop: 20 }}>
          <Skeleton />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ margin: "20px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#DC2626", fontWeight: 600, marginBottom: 10 }}>
            Couldn't load your orders
          </div>
          <button onClick={refetch} style={{ fontSize: 12, fontWeight: 700, color: CORAL, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <EmptyState onBrowse={onBrowse} />
      )}

      {/* Active orders (pending, confirmed, preparing, ready) */}
      {!loading && !error && activeOrders.length > 0 && (
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
            Active · {activeOrders.length}
          </div>
          {activeOrders.map(order => <OrderCard key={order.id} order={order} onReview={onReview} reviewedOrderIds={reviewedOrderIds} onReorder={onReorder} />)}
        </div>
      )}

      {/* Past orders (completed, cancelled) */}
      {!loading && !error && pastOrders.length > 0 && (
        <div style={{ padding: activeOrders.length > 0 ? "8px 20px 0" : "20px 20px 0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
            Past orders · {pastOrders.length}
          </div>
          {pastOrders.map(order => <OrderCard key={order.id} order={order} onReview={onReview} reviewedOrderIds={reviewedOrderIds} onReorder={onReorder} />)}
        </div>
      )}

    </div>
  );
}
