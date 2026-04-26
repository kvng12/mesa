// src/hooks/useReviews.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useReviews(userId) {
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());

  useEffect(() => {
    if (!userId) return;
    fetchUserReviews();
  }, [userId]);

  async function fetchUserReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select("order_id")
      .eq("customer_id", userId);
    if (error) return;
    setReviewedOrderIds(new Set((data || []).map(r => r.order_id)));
  }

  async function submitReview({ orderId, restaurantId, rating, comment }) {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        order_id:      orderId,
        restaurant_id: restaurantId,
        customer_id:   userId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (!error) setReviewedOrderIds(prev => new Set([...prev, orderId]));
    return { data, error };
  }

  async function fetchRestaurantReviews(restaurantId) {
    const { data } = await supabase
      .from("reviews")
      .select(`*, profiles(full_name)`)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data || [];
  }

  return { reviewedOrderIds, submitReview, fetchRestaurantReviews };
}
