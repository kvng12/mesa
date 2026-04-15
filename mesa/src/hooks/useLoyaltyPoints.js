// src/hooks/useLoyaltyPoints.js
// Points are per customer per restaurant.
// Earning: ₦1000 spent = 10 points (triggered when order status → completed/delivered).
// Redemption: 100 points = ₦500 discount at checkout.

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ── Customer: fetch points balance at a specific restaurant ──
export function useLoyaltyPoints(customerId, restaurantId) {
  const [points, setPoints]   = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId || !restaurantId) { setPoints(0); return; }
    setLoading(true);
    supabase
      .from("loyalty_points")
      .select("points")
      .eq("customer_id", customerId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle()
      .then(({ data }) => {
        setPoints(data?.points || 0);
        setLoading(false);
      });
  }, [customerId, restaurantId]);

  return { points, loading };
}

// ── Award points after an order is completed/delivered ───────
// Call this from useIncomingOrders.updateStatus on completion.
export async function awardLoyaltyPoints(customerId, restaurantId, subtotal) {
  const earned = Math.floor(subtotal / 1000) * 10;
  if (earned <= 0 || !customerId || !restaurantId) return;

  const { data: existing } = await supabase
    .from("loyalty_points")
    .select("id, points, total_earned")
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("loyalty_points")
      .update({
        points:       existing.points + earned,
        total_earned: existing.total_earned + earned,
        updated_at:   new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("loyalty_points").insert({
      customer_id:   customerId,
      restaurant_id: restaurantId,
      points:        earned,
      total_earned:  earned,
    });
  }
}

// ── Redeem 100 points for ₦500 at checkout ───────────────────
export async function redeemLoyaltyPoints(customerId, restaurantId) {
  const { data: existing } = await supabase
    .from("loyalty_points")
    .select("id, points")
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!existing || existing.points < 100) return { error: "Not enough points" };

  const { error } = await supabase
    .from("loyalty_points")
    .update({
      points:     existing.points - 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  return { error: error?.message || null };
}
