// src/hooks/useProfile.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useProfile(userId) {
  const [profile, setProfile]           = useState(null);
  const [reservations, setReservations] = useState([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchReservations();
  }, [userId]);

  async function fetchProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data || null);
  }

  async function fetchReservations() {
    const { data } = await supabase
      .from("reservations")
      .select(`*, restaurants(name, icon, address)`)
      .eq("customer_id", userId)
      .not("status", "eq", "cancelled")
      .order("reserved_at", { ascending: true })
      .limit(10);
    setReservations(data || []);
  }

  async function updateProfile({ fullName, phone }) {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", userId);
    if (!err) setProfile(p => ({ ...p, full_name: fullName, phone }));
    else setError(err.message);
    setSaving(false);
    return { error: err };
  }

  return { profile, reservations, saving, error, updateProfile, refetchReservations: fetchReservations };
}
