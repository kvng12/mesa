// src/hooks/usePromoCodes.js
import { useState } from "react";
import { supabase } from "../lib/supabase";

// ── Owner: manage promo codes for a restaurant ───────────────
export function usePromoCodes(restaurantId) {
  const [codes, setCodes]     = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchCodes() {
    if (!restaurantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    setCodes(data || []);
    setLoading(false);
  }

  async function createCode({ code, discountType, discountValue, minOrder, maxUses, expiresAt }) {
    const { error } = await supabase.from("promo_codes").insert({
      code:           code.toUpperCase().trim(),
      restaurant_id:  restaurantId,
      discount_type:  discountType,
      discount_value: discountValue,
      min_order:      minOrder  || 0,
      max_uses:       maxUses   || null,
      expires_at:     expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    if (!error) fetchCodes();
    return { error };
  }

  async function toggleCode(id, currentActive) {
    await supabase.from("promo_codes").update({ is_active: !currentActive }).eq("id", id);
    fetchCodes();
  }

  return { codes, loading, fetchCodes, createCode, toggleCode };
}

// ── Customer: validate a promo code at checkout ───────────────
export async function validatePromoCode(code, restaurantId, subtotal) {
  if (!code?.trim()) return { valid: false, reason: "Enter a promo code" };

  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return { valid: false, reason: "Invalid promo code" };
  if (data.expires_at && new Date(data.expires_at) < new Date())
    return { valid: false, reason: "This code has expired" };
  if (data.max_uses !== null && data.uses_count >= data.max_uses)
    return { valid: false, reason: "This code has reached its limit" };
  if (subtotal < data.min_order)
    return { valid: false, reason: `Minimum order ₦${Number(data.min_order).toLocaleString()} required` };

  const discount = data.discount_type === "percent"
    ? Math.round(subtotal * data.discount_value / 100)
    : Math.min(data.discount_value, subtotal);

  return { valid: true, promo: data, discount };
}
