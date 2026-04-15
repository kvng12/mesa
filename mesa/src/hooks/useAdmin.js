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
    if (r.error) console.error("[admin] restaurants count error:", r.error);
    if (o.error) console.error("[admin] orders count error:", o.error);
    if (u.error) console.error("[admin] profiles count error:", u.error);
    if (p.error) console.error("[admin] pending apps count error:", p.error);
    setStats({
      restaurants: r.count ?? 0,
      orders:      o.count ?? 0,
      users:       u.count ?? 0,
      pending:     p.count ?? 0,
    });
  }

  async function approveApplication(id) {
    setActionLoading(id);

    // 1. Fetch the full application record
    const { data: app, error: fetchErr } = await supabase
      .from("restaurant_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !app) {
      setActionLoading(null);
      return { error: fetchErr || { message: "Application not found" } };
    }

    // 2. Guard: skip insert if a restaurant already exists for this owner
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", app.applicant_id)
      .maybeSingle();

    if (!existing) {
      // 3. Create the restaurant row from application data
      const { error: insertErr } = await supabase
        .from("restaurants")
        .insert({
          name:        app.name,
          owner_id:    app.applicant_id,
          category:    app.category,
          description: app.description,
          address:     app.address,
          phone:       app.phone,
          state:       app.state,
          icon:        app.icon,
          bg_from:     app.bg_from,
          bg_to:       app.bg_to,
          tags:        app.tags || [],
          is_open:     false,
        });

      if (insertErr) {
        setActionLoading(null);
        return { error: insertErr };
      }
    }

    // 4. Mark application as approved
    const { error: approveErr } = await supabase
      .from("restaurant_applications")
      .update({ status: "approved" })
      .eq("id", id);

    if (approveErr) {
      setActionLoading(null);
      return { error: approveErr };
    }

    // 5. Upgrade the applicant's role to "owner" so they can access the store tab
    await supabase
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", app.applicant_id);

    setActionLoading(null);
    fetchApplications();
    fetchStats();
    return { error: null };
  }

  // One-time backfill: create restaurant rows for any approved applications
  // that don't yet have a matching entry in the restaurants table.
  async function backfillApprovedApplications() {
    const { data: approved } = await supabase
      .from("restaurant_applications")
      .select("*")
      .eq("status", "approved");

    if (!approved?.length) return { created: 0 };

    const { data: existingRestaurants } = await supabase
      .from("restaurants")
      .select("owner_id");

    const existingOwnerIds = new Set((existingRestaurants || []).map(r => r.owner_id));

    const toInsert = approved
      .filter(app => !existingOwnerIds.has(app.applicant_id))
      .map(app => ({
        name:        app.name,
        owner_id:    app.applicant_id,
        category:    app.category,
        description: app.description,
        address:     app.address,
        phone:       app.phone,
        state:       app.state,
        icon:        app.icon,
        bg_from:     app.bg_from,
        bg_to:       app.bg_to,
        tags:        app.tags || [],
        is_open:     false,
      }));

    if (!toInsert.length) return { created: 0 };

    const { error } = await supabase.from("restaurants").insert(toInsert);
    if (error) return { created: 0, error };

    // Also ensure these applicants have role=owner
    for (const app of approved.filter(a => !existingOwnerIds.has(a.applicant_id))) {
      await supabase.from("profiles").update({ role: "owner" }).eq("id", app.applicant_id);
    }

    fetchStats();
    return { created: toInsert.length };
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
    fetchApplications, fetchStats, approveApplication, rejectApplication,
    deletePost, backfillApprovedApplications,
  };
}
