// src/hooks/useRegistration.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useRegistration(userId) {
  const [application, setApplication] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchApplication();
  }, [userId]);

  async function fetchApplication() {
    const { data } = await supabase
      .from("restaurant_applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setApplication(data || null);
    setLoaded(true);
  }

  async function submitApplication(formData) {
    setSubmitting(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("restaurant_applications")
      .insert({ applicant_id: userId, ...formData })
      .select()
      .single();
    setSubmitting(false);
    if (err) { setError(err.message); return { error: err.message }; }
    setApplication(data);
    return { data, error: null };
  }

  return { application, submitting, error, loaded, submitApplication };
}
