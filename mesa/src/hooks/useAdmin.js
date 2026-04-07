// src/hooks/useAdmin.js
import { useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdmin() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // holds id of item being actioned

  async function fetchApplications() {
    setLoading(true);
    const { data } = await supabase
      .from("restaurant_applications")
      .select(`*, profiles(full_name, phone)`)
      .order("created_at", { ascending: false });
    setApplications(data || []);
    setLoading(false);
  }

  async function fetchStats() {
    const [r, o, u, p] = await Promise.all([
      supabase.from("restaurants").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("restaurant_applications").select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    setStats({
      restaurants: r.count ?? 0,
      orders:      o.count ?? 0,
      users:       u.count ?? 0,
      pending:     p.count ?? 0,
    });
  }

  async function approveApplication(id) {
    setActionLoading(id);
    const { error } = await supabase.rpc("approve_restaurant_application", { app_id: id });
    setActionLoading(null);
    if (!error) fetchApplications();
    return { error };
  }

  async function rejectApplication(id, note) {
    setActionLoading(id);
    const { error } = await supabase
      .from("restaurant_applications")
      .update({ status: "rejected", admin_note: note || "Application declined." })
      .eq("id", id);
    setActionLoading(null);
    if (!error) fetchApplications();
    return { error };
  }

  async function deletePost(postId) {
    await supabase.from("posts").delete().eq("id", postId);
  }

  return {
    applications, stats, loading, actionLoading,
    fetchApplications, fetchStats, approveApplication, rejectApplication, deletePost,
  };
}
