// src/components/AdminFraudDashboard.jsx
// 4-tab fraud and escrow dashboard for admin users.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const PRIMARY = "#8B1A1A";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const REASON_LABELS = {
  not_received: "Not received",
  wrong_order:  "Wrong order",
  poor_quality: "Poor quality",
  other:        "Other",
};

const TABS = [
  { id: "customers",    label: "👤 Risky Customers"       },
  { id: "restaurants",  label: "🏪 Suspicious Restaurants" },
  { id: "disputes",     label: "⚠️ Open Disputes"          },
  { id: "escrow",       label: "💰 Escrow Ledger"          },
  { id: "payouts",      label: "🏦 Daily Payouts"          },
];

export default function AdminFraudDashboard() {
  const [tab, setTab]               = useState("customers");
  const [customers, setCustomers]   = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [disputes, setDisputes]     = useState([]);
  const [escrow, setEscrow]         = useState({ held: 0, releasedWeek: 0, pending: [] });
  const [payouts, setPayouts]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [actionBusy, setActionBusy] = useState(null);

  useEffect(() => { fetchTab(tab); }, [tab]);

  const fetchTab = (t) => {
    if (t === "customers")   fetchRiskyCustomers();
    else if (t === "restaurants") fetchSuspiciousRestaurants();
    else if (t === "disputes")    fetchOpenDisputes();
    else if (t === "escrow")      fetchEscrowSummary();
    else if (t === "payouts")     fetchPayouts();
  };

  const fetchPayouts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("restaurant_payouts")
      .select("*, restaurants(name, icon, account_name, bank_name, account_number)")
      .order("created_at", { ascending: false })
      .limit(100);
    setPayouts(data || []);
    setLoading(false);
  };

  const markAsPaid = async (payoutId) => {
    setActionBusy(payoutId);
    await supabase
      .from("restaurant_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payoutId);
    setActionBusy(null);
    fetchPayouts();
  };

  const exportCSV = () => {
    const pending = payouts.filter(p => p.status === "pending");
    if (!pending.length) { alert("No pending payouts to export."); return; }
    const rows = [
      ["Restaurant", "Bank", "Account Number", "Account Name", "Amount (NGN)", "Period Start", "Period End"],
      ...pending.map(p => [
        p.restaurants?.name || "",
        p.restaurants?.bank_name || p.bank_name || "",
        p.restaurants?.account_number || p.account_number || "",
        p.restaurants?.account_name || p.account_name || "",
        p.amount,
        p.period_start,
        p.period_end,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `chowli-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchRiskyCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, orders_placed, orders_completed, cancellation_count, cash_orders_blocked")
      .gt("orders_placed", 5)
      .order("orders_placed", { ascending: false });
    setCustomers(
      (data || []).filter(p => {
        const rate = p.orders_placed > 0 ? p.orders_completed / p.orders_placed : 1;
        return rate < 0.6 || p.cash_orders_blocked;
      })
    );
    setLoading(false);
  };

  const fetchSuspiciousRestaurants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, icon, false_delivery_count, suspended, verified")
      .gt("false_delivery_count", 0)
      .order("false_delivery_count", { ascending: false });
    setRestaurants(data || []);
    setLoading(false);
  };

  const fetchOpenDisputes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select("id, order_id, reason, description, created_at, orders(subtotal, profiles(full_name)), restaurants(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setDisputes(data || []);
    setLoading(false);
  };

  const fetchEscrowSummary = async () => {
    setLoading(true);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [{ data: held }, { data: released }, { data: pending }] = await Promise.all([
      supabase.from("escrow_ledger").select("amount").eq("status", "held"),
      supabase.from("escrow_ledger").select("amount").eq("status", "released").gte("released_at", weekAgo),
      supabase.from("escrow_ledger").select("amount, restaurants(name)").eq("status", "pending_release"),
    ]);
    setEscrow({
      held:         (held     || []).reduce((s, r) => s + Number(r.amount), 0),
      releasedWeek: (released || []).reduce((s, r) => s + Number(r.amount), 0),
      pending:       pending  || [],
    });
    setLoading(false);
  };

  const resolveDispute = async (disputeId, action) => {
    setActionBusy(disputeId + action);
    const d = disputes.find(x => x.id === disputeId);
    if (!d) return;
    const now = new Date().toISOString();
    if (action === "refund") {
      await supabase.from("disputes").update({ status: "resolved", admin_note: "Refunded to customer", resolved_at: now }).eq("id", disputeId);
      await supabase.from("escrow_ledger").update({ status: "refunded", released_at: now }).eq("order_id", d.order_id);
      await supabase.from("orders").update({ payment_released: false, payment_held: false }).eq("id", d.order_id);
    } else {
      await supabase.from("disputes").update({ status: "rejected", admin_note: "Released to restaurant", resolved_at: now }).eq("id", disputeId);
      await supabase.from("escrow_ledger").update({ status: "released", released_at: now }).eq("order_id", d.order_id);
      await supabase.from("orders").update({ payment_released: true, confirmed_at: now }).eq("id", d.order_id);
    }
    setActionBusy(null);
    fetchOpenDisputes();
  };

  const verifyRestaurant = async (restaurantId) => {
    setActionBusy("verify-" + restaurantId);
    await supabase.from("restaurants").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", restaurantId);
    setActionBusy(null);
    fetchSuspiciousRestaurants();
  };

  const unsuspend = async (restaurantId) => {
    setActionBusy("unsuspend-" + restaurantId);
    await supabase.from("restaurants").update({ suspended: false, false_delivery_count: 0 }).eq("id", restaurantId);
    setActionBusy(null);
    fetchSuspiciousRestaurants();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 14 }}>🔒 Fraud & Escrow</div>

      {/* Tab strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: "7px 11px", borderRadius: 12, border: `1.5px solid ${tab === t.id ? PRIMARY : "#EBEBEB"}`, background: tab === t.id ? "rgba(139,26,26,0.06)" : "#fff", color: tab === t.id ? PRIMARY : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "24px 0", color: "#B0B0B0", fontSize: 13 }}>Loading...</div>}

      {/* ── Risky Customers ──────────────────────────────────── */}
      {!loading && tab === "customers" && (
        customers.length === 0
          ? <EmptyCard>No risky customers found ✓</EmptyCard>
          : customers.map(c => {
              const rate = c.orders_placed > 0 ? Math.round((c.orders_completed / c.orders_placed) * 100) : 0;
              const rateColor = rate < 40 ? "#DC2626" : "#D97706";
              return (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{c.full_name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{c.phone || "No phone"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: rateColor }}>{rate}%</div>
                      <div style={{ fontSize: 10, color: "#B0B0B0" }}>{c.orders_completed}/{c.orders_placed} completed</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {c.cash_orders_blocked && <Tag bg="#FEF2F2" color="#DC2626">Cash blocked</Tag>}
                    {c.cancellation_count > 0 && <Tag bg="#FFFBEB" color="#D97706">{c.cancellation_count} cancellations</Tag>}
                  </div>
                </div>
              );
            })
      )}

      {/* ── Suspicious Restaurants ───────────────────────────── */}
      {!loading && tab === "restaurants" && (
        restaurants.length === 0
          ? <EmptyCard>No suspicious restaurants ✓</EmptyCard>
          : restaurants.map(r => (
              <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${r.suspended ? "#FECACA" : "#F0EDE8"}`, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{r.name}</span>
                      {r.verified && <Tag bg="#F0FDF4" color="#16A34A">✓ Verified</Tag>}
                      {r.suspended && <Tag bg="#FEF2F2" color="#DC2626">Suspended</Tag>}
                    </div>
                    <div style={{ fontSize: 11, color: r.false_delivery_count >= 3 ? "#DC2626" : "#D97706" }}>
                      {r.false_delivery_count} false delivery report{r.false_delivery_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {r.suspended && (
                    <button onClick={() => unsuspend(r.id)} disabled={actionBusy === "unsuspend-" + r.id}
                      style={btnStyle("#F0FDF4", "#16A34A")}>
                      Unsuspend
                    </button>
                  )}
                  {!r.verified && (
                    <button onClick={() => verifyRestaurant(r.id)} disabled={actionBusy === "verify-" + r.id}
                      style={btnStyle("#EFF6FF", "#2563EB")}>
                      ✓ Verify Restaurant
                    </button>
                  )}
                </div>
              </div>
            ))
      )}

      {/* ── Open Disputes ────────────────────────────────────── */}
      {!loading && tab === "disputes" && (
        disputes.length === 0
          ? <EmptyCard>No open disputes 🎉</EmptyCard>
          : disputes.map(d => {
              const hoursOpen = Math.floor((Date.now() - new Date(d.created_at)) / 3600000);
              return (
                <div key={d.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{d.restaurants?.name || "Unknown restaurant"}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {d.orders?.profiles?.full_name || "Customer"} · ₦{Number(d.orders?.subtotal || 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Tag bg="#FFFBEB" color="#D97706">{REASON_LABELS[d.reason]}</Tag>
                      <div style={{ fontSize: 10, color: "#B0B0B0", marginTop: 4 }}>{hoursOpen}h open</div>
                    </div>
                  </div>
                  {d.description && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 10, lineHeight: 1.5, background: BG, borderRadius: 8, padding: "6px 10px" }}>
                      {d.description}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => resolveDispute(d.id, "refund")}
                      disabled={!!actionBusy}
                      style={{ ...btnStyle("#FEF2F2", "#DC2626"), flex: 1 }}
                    >
                      {actionBusy === d.id + "refund" ? "..." : "Refund Customer"}
                    </button>
                    <button
                      onClick={() => resolveDispute(d.id, "release")}
                      disabled={!!actionBusy}
                      style={{ ...btnStyle("#F0FDF4", "#16A34A"), flex: 1 }}
                    >
                      {actionBusy === d.id + "release" ? "..." : "Release to Restaurant"}
                    </button>
                  </div>
                </div>
              );
            })
      )}

      {/* ── Escrow Ledger ────────────────────────────────────── */}
      {!loading && tab === "escrow" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <StatBox n={`₦${Number(escrow.held).toLocaleString()}`} label="Currently Held" color={PRIMARY} />
            <StatBox n={`₦${Number(escrow.releasedWeek).toLocaleString()}`} label="Released This Week" color="#16A34A" />
          </div>
          {escrow.pending.length === 0 ? (
            <EmptyCard>No pending payouts</EmptyCard>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Pending Payouts</div>
              {escrow.pending.map((e, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{e.restaurants?.name || "Unknown"}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>₦{Number(e.amount).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Daily Payouts ─────────────────────────────────────── */}
      {!loading && tab === "payouts" && (
        <div>
          {/* Summary row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <StatBox
              n={`₦${payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`}
              label="Pending Total"
              color={PRIMARY}
            />
            <StatBox
              n={payouts.filter(p => p.status === "pending").length}
              label="Pending Count"
              color="#D97706"
            />
            <StatBox
              n={payouts.filter(p => p.status === "paid").length}
              label="Paid"
              color="#16A34A"
            />
          </div>

          {/* Export button */}
          <button onClick={exportCSV}
            style={{ width: "100%", padding: "10px", background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #BFDBFE", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 14 }}>
            ⬇ Export Pending Payouts CSV
          </button>

          {payouts.length === 0 ? (
            <EmptyCard>No payout records yet</EmptyCard>
          ) : (
            payouts.map(p => {
              const r    = p.restaurants || {};
              const paid = p.status === "paid";
              const dtStart = p.period_start ? new Date(p.period_start).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "";
              const dtEnd   = p.period_end   ? new Date(p.period_end).toLocaleDateString("en-NG",   { day: "numeric", month: "short" }) : "";
              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${paid ? "#F0EDE8" : "#FED7AA"}`, padding: "12px 14px", marginBottom: 8, opacity: paid ? 0.7 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{r.icon} {r.name || "Unknown restaurant"}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{dtStart} – {dtEnd}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: paid ? "#16A34A" : PRIMARY }}>₦{Number(p.amount).toLocaleString()}</div>
                      <Tag bg={paid ? "#F0FDF4" : "#FFFBEB"} color={paid ? "#16A34A" : "#D97706"}>
                        {paid ? "✓ Paid" : "Pending"}
                      </Tag>
                    </div>
                  </div>
                  {/* Bank details */}
                  <div style={{ background: BG, borderRadius: 8, padding: "7px 10px", marginBottom: 8, fontSize: 11, color: "#888" }}>
                    <span style={{ fontWeight: 700, color: DARK }}>{r.bank_name || p.bank_name || "No bank on file"}</span>
                    {(r.account_number || p.account_number) && (
                      <> · ****{(r.account_number || p.account_number).slice(-4)} · {r.account_name || p.account_name}</>
                    )}
                  </div>
                  {p.notes && <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{p.notes}</div>}
                  {!paid && (
                    <button
                      onClick={() => markAsPaid(p.id)}
                      disabled={actionBusy === p.id}
                      style={{ ...btnStyle("#F0FDF4", "#16A34A"), width: "100%" }}
                    >
                      {actionBusy === p.id ? "Marking..." : "✓ Mark as Paid"}
                    </button>
                  )}
                  {paid && p.paid_at && (
                    <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>
                      Paid {new Date(p.paid_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "22px", textAlign: "center", fontSize: 13, color: "#B0B0B0" }}>
      {children}
    </div>
  );
}

function Tag({ bg, color, children }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: bg, color }}>{children}</span>
  );
}

function StatBox({ n, label, color }) {
  return (
    <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #F0EDE8", padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function btnStyle(bg, color) {
  return { padding: "8px 12px", background: bg, color, border: "none", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" };
}
