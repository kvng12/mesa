// src/hooks/useReservations.js

import { useState } from "react";
import { supabase } from "../lib/supabase";

// ── Customer: make & view reservations ──────────────────────
export function useReservations(userId) {
  const [reservations, setReservations] = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);

  async function fetchReservations() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("reservations")
      .select(`*, restaurants(name, icon, address)`)
      .eq("customer_id", userId)
      .order("reserved_at", { ascending: true });
    if (error) return;
    setReservations(data || []);
  }

  async function makeReservation({ restaurantId, reservedAt, partySize, preOrderNote }) {
    if (!userId) return { error: "Please sign in to make a reservation" };
    setSubmitting(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("reservations")
      .insert({
        customer_id:    userId,
        restaurant_id:  restaurantId,
        reserved_at:    reservedAt,
        party_size:     partySize,
        pre_order_note: preOrderNote || null,
      })
      .select()
      .single();

    setSubmitting(false);
    if (err) { setError(err.message); return { error: err.message }; }
    return { data, error: null };
  }

  async function cancelReservation(reservationId) {
    await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);
    fetchReservations();
  }

  return { reservations, submitting, error, fetchReservations, makeReservation, cancelReservation };
}


// ── Owner: manage incoming reservations ─────────────────────
export function useIncomingReservations(restaurantId) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(false);

  async function fetchReservations() {
    if (!restaurantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select(`*, profiles(full_name, phone)`)
      .eq("restaurant_id", restaurantId)
      .not("status", "in", '("completed","cancelled","rejected")')
      .order("reserved_at", { ascending: true });
    setReservations(data || []);
    setLoading(false);
  }

  async function respond(reservationId, status, note) {
    await supabase
      .from("reservations")
      .update({ status, restaurant_note: note || null })
      .eq("id", reservationId);
    fetchReservations();
  }

  return { reservations, loading, fetchReservations, respond };
}
