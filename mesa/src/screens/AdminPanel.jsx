// src/screens/AdminPanel.jsx
import { useState, useEffect } from "react";
import { useAdmin } from "../hooks/useAdmin";
import AdminFraudDashboard from "../components/AdminFraudDashboard";

const PRIMARY = "#8B1A1A";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const CATEGORY_COLORS = {
  pending:  { bg: "#FFFBEB", color: "#D97706", label: "Pending"  },
  approved: { bg: "#F0FDF4", color: "#16A34A", label: "Approved" },
  rejected: { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
};

function StatCard({ n, label, color }) {
  return (
    <div style={{ flex: 1, background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "16px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || PRIMARY }}>{n ?? "—"}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function AdminPanel() {
  const {
    applications, restaurantsMap, stats, loading, actionLoading,
    fetchApplications, fetchStats, approveApplication, rejectApplication,
    backfillApprovedApplications, verifyRestaurant, revokeVerification, unsuspendRestaurant,
  } = useAdmin();
  const [filter, setFilter]   = useState("pending");
  const [rejectNote, setNote] = useState({});     // { [id]: noteText }
  const [showReject, setShowReject] = useState(null); // id of app showing reject input
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const shown = applications.filter(a => a.status === filter);

  async function handleApprove(id) {
    const { error } = await approveApplication(id);
    if (error) alert("Error: " + (error.message || error));
  }

  async function handleReject(id) {
    await rejectApplication(id, rejectNote[id] || "");
    setShowReject(null);
    setNote(n => { const c = { ...n }; delete c[id]; return c; });
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "calc(90px + env(safe-area-inset-bottom))", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", padding: "max(env(safe-area-inset-top), 52px) 20px 18px", borderBottom: "1px solid #F0EDE8" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 2 }}>Admin Panel</div>
        <div style={{ fontSize: 12, color: "#888" }}>Platform overview and management</div>
      </div>

      <div style={{ padding: "16px 20px" }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <StatCard n={stats.restaurants} label="Restaurants" />
            <StatCard n={stats.orders}      label="Orders"      />
            <StatCard n={stats.users}       label="Users"       />
            <StatCard n={stats.pending}     label="Pending"     color={stats.pending > 0 ? "#D97706" : "#16A34A"} />
          </div>
        )}

        {/* Fraud & Escrow Dashboard */}
        <AdminFraudDashboard />

        <div style={{ height: 1, background: "#F0EDE8", margin: "4px 0 20px" }} />

        {/* Applications section */}
        <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 14 }}>Restaurant Applications</div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["pending","approved","rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 999, border: "1.5px solid", borderColor: filter === s ? PRIMARY : "#EBEBEB", background: filter === s ? "rgba(139,26,26,0.06)" : "#fff", color: filter === s ? PRIMARY : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: "capitalize" }}>
              {s} {applications.filter(a => a.status === s).length > 0 && `(${applications.filter(a => a.status === s).length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#B0B0B0", fontSize: 13 }}>Loading...</div>
        )}

        {!loading && shown.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0EDE8", padding: "28px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, color: "#B0B0B0" }}>No {filter} applications</div>
          </div>
        )}

        {shown.map(app => {
          const sc    = CATEGORY_COLORS[app.status];
          const busy  = actionLoading === app.id;
          const dt    = new Date(app.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

          return (
            <div key={app.id} style={{ background: "#fff", borderRadius: 20, border: "1px solid #F0EDE8", marginBottom: 12, overflow: "hidden" }}>
              {/* Colour strip */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${app.bg_from}, ${app.bg_to})` }} />

              <div style={{ padding: "16px" }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${app.bg_from}, ${app.bg_to})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {app.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 2 }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{Array.isArray(app.category) ? app.category.join(", ") : app.category} · {app.address}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                </div>

                {/* Applicant info */}
                <div style={{ background: BG, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 2 }}>👤 {app.profiles?.full_name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>📞 {app.phone} · Applied {dt}</div>
                </div>

                {app.description && (
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 12 }}>{app.description}</div>
                )}

                {app.admin_note && (
                  <div style={{ fontSize: 11, color: "#888", background: "#FFFBEB", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>Admin note: {app.admin_note}</div>
                )}

                {/* Verify / Suspend controls — only for approved apps */}
                {app.status === "approved" && (() => {
                  const rest = restaurantsMap[app.applicant_id];
                  if (!rest) return null;
                  const verifyKey   = "verify-"    + rest.id;
                  const revokeKey   = "revoke-"    + rest.id;
                  const unsuspendKey = "unsuspend-" + rest.id;
                  const verifiedAt  = rest.verified_at
                    ? new Date(rest.verified_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
                    : null;

                  return (
                    <div style={{ borderTop: "1px solid #F0EDE8", paddingTop: 12, marginTop: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#B0B0B0", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                        Restaurant Status
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>

                        {/* Verified state */}
                        {rest.verified ? (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "6px 12px" }}>
                              <span style={{ fontSize: 13 }}>✓</span>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#16A34A" }}>Verified</div>
                                {verifiedAt && <div style={{ fontSize: 9, color: "#86EFAC" }}>{verifiedAt}</div>}
                              </div>
                            </div>
                            <button
                              onClick={() => revokeVerification(rest.id)}
                              disabled={actionLoading === revokeKey}
                              style={{ fontSize: 10, fontWeight: 700, color: "#888", background: "#F5F5F5", border: "1px solid #E0E0E0", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                              {actionLoading === revokeKey ? "..." : "Revoke"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => verifyRestaurant(rest.id)}
                            disabled={actionLoading === verifyKey}
                            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#fff", background: actionLoading === verifyKey ? "#86EFAC" : "#16A34A", border: "none", borderRadius: 10, padding: "8px 16px", cursor: actionLoading === verifyKey ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          >
                            {actionLoading === verifyKey ? "Verifying..." : "✓ Verify Restaurant"}
                          </button>
                        )}

                        {/* Suspended state */}
                        {rest.suspended && (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "6px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#DC2626" }}>⛔ Suspended</span>
                            </div>
                            <button
                              onClick={() => unsuspendRestaurant(rest.id)}
                              disabled={actionLoading === unsuspendKey}
                              style={{ fontSize: 12, fontWeight: 800, color: "#DC2626", background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "7px 14px", cursor: actionLoading === unsuspendKey ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                              {actionLoading === unsuspendKey ? "..." : "Unsuspend"}
                            </button>
                          </>
                        )}

                      </div>
                    </div>
                  );
                })()}

                {/* Actions — only for pending */}
                {app.status === "pending" && (
                  <>
                    {showReject === app.id ? (
                      <div>
                        <textarea
                          value={rejectNote[app.id] || ""}
                          onChange={e => setNote(n => ({ ...n, [app.id]: e.target.value }))}
                          placeholder="Optional note to applicant (e.g. 'Please provide a clearer address')"
                          style={{ width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 12, background: BG, outline: "none", fontSize: 13, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "10px 12px", lineHeight: 1.5, minHeight: 70, resize: "none", marginBottom: 10 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setShowReject(null)} style={{ flex: 1, padding: "10px", background: BG, color: "#888", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                          <button onClick={() => handleReject(app.id)} disabled={busy} style={{ flex: 2, padding: "10px", background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                            {busy ? "Declining..." : "Confirm Decline"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setShowReject(app.id)} style={{ flex: 1, padding: "11px", background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                          ✕ Decline
                        </button>
                        <button onClick={() => handleApprove(app.id)} disabled={busy} style={{ flex: 2, padding: "11px", background: "#F0FDF4", color: "#16A34A", border: "none", borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                          {busy ? "Approving..." : "✓ Approve & Create Store"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Refresh */}
        <button onClick={() => { fetchApplications(); fetchStats(); }}
          style={{ width: "100%", padding: 12, background: "#fff", color: "#888", border: "1.5px solid #EBEBEB", borderRadius: 14, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8 }}>
          Refresh Data
        </button>

        {/* One-time backfill — creates restaurant rows for approved applications that are missing them */}
        <button
          onClick={async () => {
            setBackfilling(true);
            setBackfillResult(null);
            const result = await backfillApprovedApplications();
            setBackfilling(false);
            setBackfillResult(result);
          }}
          disabled={backfilling}
          style={{ width: "100%", padding: 12, background: backfilling ? "#F9F9F9" : "rgba(139,26,26,0.06)", color: PRIMARY, border: `1.5px solid ${PRIMARY}`, borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: backfilling ? "not-allowed" : "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8, opacity: backfilling ? 0.6 : 1 }}>
          {backfilling ? "Running backfill..." : "🔧 Backfill: Create missing restaurant rows"}
        </button>
        {backfillResult && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 10,
            background: backfillResult.error ? "#FEF2F2" : "#F0FDF4",
            color: backfillResult.error ? "#DC2626" : "#16A34A" }}>
            {backfillResult.error
              ? `Error: ${backfillResult.error.message || backfillResult.error}`
              : backfillResult.created === 0
                ? "All approved applications already have restaurant rows."
                : `Created ${backfillResult.created} restaurant row${backfillResult.created !== 1 ? "s" : ""}. Refresh to see them.`}
          </div>
        )}
      </div>
    </div>
  );
}
