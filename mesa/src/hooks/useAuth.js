import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount — clear stale tokens gracefully
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Invalid or expired refresh token — wipe the local session so the user
        // sees the login screen instead of getting stuck in a broken state
        supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          // Refresh failed — clear state so user lands on login
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  // Email + password sign up
  async function signUp({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { data, error };
  }

  // Email + password sign in
  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  // Magic link (no password needed — good for low-friction mobile login)
  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Re-fetch profile from DB (e.g. after phone verification updates phone_verified)
  async function refreshProfile() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await fetchProfile(currentUser.id);
  }

  const isOwner = profile?.role === "owner" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  return { user, profile, loading, isOwner, isAdmin, signUp, signIn, signInWithMagicLink, signOut, refreshProfile };
}
