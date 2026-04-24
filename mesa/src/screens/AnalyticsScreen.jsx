// src/screens/AnalyticsScreen.jsx
// Restaurant owner analytics — revenue, orders, top items

import { useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";

const PRIMARY = "#8B1A1A";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

function fmt(n) { return Number(n || 0).toLocaleString(); }

function SkeletonBox({ h = 80 }) {
  return <div style={{ height: h, background: "#F0EDE8", borderRadius: 16, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />;
}

function StatCard({ label, value, sub, color = PRIMARY, icon }) {
  return (
    <div style={{ flex: 1, background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "14px 12px", textAlign: "center", minWidth: 0 }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBarChart({ data }) {
  if (!data?.length) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#B0B0B0", fontSize: 13 }}>No data for this period</div>
  );
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, padding: "0 4px" }}>
      {data.slice(-14).map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const day = new Date(d.date).toLocaleDateString("en-NG", { weekday: "short" });
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: `${Math.max(pct, 4)}%`, background: pct > 60 ? PRIMARY : pct > 30 ? "#FF8C6B" : "#FFD0C0", borderRadius: "4px 4px 0 0", transition: "height 0.4s", minHeight: 4 }} />
            <div style={{ fontSize: 8, color: "#C0C0C0", fontWeight: 600 }}>{day}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsScreen({ restaurantId, restaurantName, onClose }) {
  const { data, loading, period, setPeriod } = useAnalytics(restaurantId);

  const periods = [
    { id: "7d",  label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "all", label: "All time" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 300, maxWidth: 430, margin: "0 auto", overflowY: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${PRIMARY}, #FF8C42)`, padding: "max(env(safe-area-inset-top), 52px) 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Analytics</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{restaurantName}</div>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {periods.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              style={{ flex: 1, padding: "8px", borderRadius: 20, border: "none", background: period === p.id ? "#fff" : "rgba(255,255,255,0.2)", color: period === p.id ? PRIMARY : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>

        {loading ? (
          <>
            <SkeletonBox h={90} />
            <SkeletonBox h={120} />
            <SkeletonBox h={160} />
          </>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <div style={{ fontSize: 14, color: "#B0B0B0" }}>No data yet</div>
          </div>
        ) : (
          <>
            {/* Today snapshot */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Today</div>
              <div style={{ display: "flex", gap: 10 }}>
                <StatCard icon="🧾" label="Orders" value={data.todayOrders} color={DARK} />
                <StatCard icon="💰" label="Revenue" value={`₦${fmt(data.todayRevenue)}`} color={PRIMARY} />
              </div>
            </div>

            {/* Period stats */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
                {period === "7d" ? "Last 7 days" : period === "30d" ? "Last 30 days" : "All time"}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <StatCard label="Revenue" value={`₦${fmt(data.totalRevenue)}`} color={PRIMARY} />
                <StatCard label="Orders" value={data.totalOrders} color={DARK} />
                <StatCard label="Completed" value={`${data.completionRate}%`} color="#16A34A" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatCard label="Avg order" value={`₦${fmt(data.avgOrderValue)}`} color="#2563EB" />
                <StatCard label="Cancelled" value={data.cancelledCount} color="#DC2626" />
              </div>
            </div>

            {/* Revenue chart */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Daily Revenue</div>
              <MiniBarChart data={data.dailyRevenue} />
            </div>

            {/* Top items */}
            {data.topItems.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Top Selling Items</div>
                {data.topItems.map((item, i) => {
                  const maxQty = data.topItems[0].quantity;
                  const pct    = (item.quantity / maxQty) * 100;
                  return (
                    <div key={item.name} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 8, background: i === 0 ? PRIMARY : i === 1 ? "#FF8C6B" : "#FFD0C0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>{i + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: DARK, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: PRIMARY }}>₦{fmt(item.revenue)}</div>
                          <div style={{ fontSize: 10, color: "#B0B0B0" }}>{item.quantity} sold</div>
                        </div>
                      </div>
                      <div style={{ height: 5, background: "#F0EDE8", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? PRIMARY : "#FFD0C0", borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
