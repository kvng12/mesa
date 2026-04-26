// src/components/BankDetailsForm.jsx
// Reusable bank account collection form with Paystack verification.
//
// Props:
//   value   — { bankName, bankCode, accountNumber, accountName, verified }
//   onChange — called with updated value object whenever state changes
//   disabled — grey out the whole form (e.g. while parent is submitting)
//
// Verification flow:
//   1. User selects a bank from the searchable dropdown (fetched from Paystack)
//   2. User types 10-digit account number
//   3. Auto-verify fires via the Supabase Edge Function `verify-bank-account`
//   4. On success: green "✓ Verified — <Account Name>" badge appears
//   5. Everywhere else the account number is masked as ****XXXX

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const PRIMARY = "#8B1A1A";
const DARK  = "#1C1C1E";
const BG    = "#F5F5F5";

const labelStyle = {
  fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8,
};

function maskAccount(num) {
  if (!num || num.length < 4) return num;
  return "****" + num.slice(-4);
}

export default function BankDetailsForm({ value = {}, onChange, disabled = false }) {
  const {
    bankName     = "",
    bankCode     = "",
    accountNumber = "",
    accountName  = "",
    verified     = false,
  } = value;

  const [banks, setBanks]           = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [showBankList, setShowBankList] = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [verifyError, setVerifyError] = useState("");
  // local raw input — while typing we show the real digits
  const [inputFocused, setInputFocused] = useState(false);
  const verifyTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── Fetch Nigerian banks from Paystack ───────────────────────
  useEffect(() => {
    (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch(
          "https://api.paystack.co/bank?currency=NGN&use_cursor=false&perPage=100",
          { headers: { Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}` } }
        );
        const json = await res.json();
        if (json.status && Array.isArray(json.data)) {
          setBanks(json.data);
        }
      } catch {
        // silently fail — user can still type bank name manually
      } finally {
        setBanksLoading(false);
      }
    })();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBankList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Auto-verify when 10 digits + bank code are both set ──────
  useEffect(() => {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);

    // Reset verification if inputs change
    if (verified) {
      onChange({ ...value, verified: false, accountName: "" });
    }
    setVerifyError("");

    if (accountNumber.length === 10 && bankCode) {
      verifyTimerRef.current = setTimeout(() => {
        verifyAccount(accountNumber, bankCode);
      }, 600);
    }
    return () => clearTimeout(verifyTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: adding `onChange` or `value` to deps causes an infinite loop —
  // the effect calls onChange which updates value which would re-trigger the effect.
  }, [accountNumber, bankCode]);

  const verifyAccount = async (accNum, bCode) => {
    setVerifying(true);
    setVerifyError("");
    try {
      const { data, error } = await supabase.functions.invoke("verify-bank-account", {
        body: { account_number: accNum, bank_code: bCode },
      });
      if (error) throw new Error(error.message);
      if (data?.verified) {
        onChange({ ...value, accountNumber: accNum, bankCode: bCode, accountName: data.account_name, verified: true });
      } else {
        setVerifyError(data?.error || "Could not verify account. Check number and bank.");
        onChange({ ...value, verified: false, accountName: "" });
      }
    } catch (err) {
      setVerifyError(err.message || "Verification failed");
      onChange({ ...value, verified: false, accountName: "" });
    } finally {
      setVerifying(false);
    }
  };

  const filteredBanks = banks.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const selectBank = (bank) => {
    onChange({ ...value, bankName: bank.name, bankCode: bank.code, verified: false, accountName: "" });
    setBankSearch("");
    setShowBankList(false);
  };

  const handleAccountChange = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    onChange({ ...value, accountNumber: digits, verified: false, accountName: "" });
  };

  return (
    <div style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}>

      {/* ── Bank selector ──────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }} ref={dropdownRef}>
        <div style={labelStyle}>Bank *</div>
        <div
          onClick={() => !disabled && setShowBankList(v => !v)}
          style={{
            width: "100%", border: `1.5px solid ${bankCode ? PRIMARY : "#EBEBEB"}`,
            borderRadius: 12, background: BG, padding: "12px 14px", cursor: "pointer",
            fontSize: 14, color: bankName ? DARK : "#B0B0B0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <span>{bankName || (banksLoading ? "Loading banks..." : "Select your bank")}</span>
          <span style={{ fontSize: 10, color: "#888" }}>{showBankList ? "▲" : "▼"}</span>
        </div>

        {showBankList && (
          <div style={{
            background: "#fff", border: "1.5px solid #EBEBEB", borderRadius: 12,
            marginTop: 4, maxHeight: 240, overflowY: "auto", zIndex: 100, position: "relative",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #F5F5F5", position: "sticky", top: 0, background: "#fff" }}>
              <input
                autoFocus
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Search banks..."
                style={{
                  width: "100%", border: "1.5px solid #EBEBEB", borderRadius: 10,
                  padding: "8px 10px", fontSize: 13, outline: "none", background: BG,
                  fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: "border-box",
                }}
              />
            </div>
            {filteredBanks.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: 13, color: "#B0B0B0" }}>No banks found</div>
            ) : filteredBanks.map(b => (
              <div
                key={b.code}
                onClick={() => selectBank(b)}
                style={{
                  padding: "11px 14px", fontSize: 13, cursor: "pointer", color: DARK,
                  background: b.code === bankCode ? "rgba(139,26,26,0.06)" : "#fff",
                  fontWeight: b.code === bankCode ? 700 : 400,
                  borderBottom: "1px solid #F9F9F9",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (b.code !== bankCode) e.currentTarget.style.background = "#F9F9F9"; }}
                onMouseLeave={e => { if (b.code !== bankCode) e.currentTarget.style.background = "#fff"; }}
              >
                {b.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Account number ─────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={labelStyle}>Account Number *</div>
        <div style={{ position: "relative" }}>
          <input
            type="tel"
            inputMode="numeric"
            value={inputFocused ? accountNumber : (accountNumber.length === 10 && !inputFocused ? maskAccount(accountNumber) : accountNumber)}
            onChange={e => handleAccountChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="10-digit account number"
            maxLength={10}
            style={{
              width: "100%", border: `1.5px solid ${verified ? "#16A34A" : verifyError ? "#DC2626" : "#EBEBEB"}`,
              borderRadius: 12, background: BG, outline: "none",
              fontSize: 14, color: DARK, fontFamily: "'Plus Jakarta Sans', sans-serif",
              padding: "12px 44px 12px 14px", boxSizing: "border-box",
              letterSpacing: (!inputFocused && accountNumber.length === 10) ? "0.08em" : "normal",
            }}
          />
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
            {verifying && <span style={{ fontSize: 12, color: "#888", animation: "pulse 1s infinite" }}>...</span>}
            {!verifying && verified && <span>✅</span>}
            {!verifying && !verified && accountNumber.length === 10 && verifyError && <span>❌</span>}
          </div>
        </div>
      </div>

      {/* ── Verification status ────────────────────────────────── */}
      {verifying && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Verifying account...</div>
      )}
      {!verifying && verified && accountName && (
        <div style={{
          background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10,
          padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>✓</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#16A34A" }}>Verified</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{accountName}</div>
          </div>
        </div>
      )}
      {!verifying && verifyError && (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
          padding: "9px 14px", marginBottom: 10, fontSize: 12, color: "#DC2626", fontWeight: 600,
        }}>
          {verifyError}
        </div>
      )}
    </div>
  );
}
