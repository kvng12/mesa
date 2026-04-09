// src/hooks/useChat.js
// In-app chat between customers and restaurants.

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── Single conversation (customer ↔ restaurant) ──────────────
export function useChat({ userId, restaurantId }) {
  const [messages, setMessages]         = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const channelRef    = useRef(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId || !restaurantId) return;
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    initConversation();

    return () => {
      subscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, restaurantId]);

  async function initConversation() {
    setLoading(true);

    let { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("customer_id", userId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ customer_id: userId, restaurant_id: restaurantId })
        .select()
        .single();
      conv = newConv;
    }

    if (!conv) { setLoading(false); return; }
    setConversation(conv);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(msgs || []);
    setLoading(false);

    await markRead(conv.id, userId);

    // Build full channel with all listeners BEFORE calling .subscribe()
    channelRef.current = supabase
      .channel(`chat-${conv.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `conversation_id=eq.${conv.id}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          markRead(conv.id, userId);
        }
      )
      .subscribe();
  }

  async function sendMessage(text) {
    if (!text.trim() || !conversation) return;
    setSending(true);

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id:       userId,
        text:            text.trim(),
      });

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message:    text.trim(),
      })
      .eq("id", conversation.id);

    setSending(false);
    return { error };
  }

  async function markRead(convId, uid) {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", convId)
      .neq("sender_id", uid)
      .eq("read", false);
  }

  return { messages, conversation, loading, sending, sendMessage };
}


// ── Owner: all conversations for their restaurant ────────────
export function useOwnerChats(restaurantId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);
  const channelRef    = useRef(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!restaurantId) return;
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    fetchConversations();

    // Build all listeners BEFORE .subscribe()
    channelRef.current = supabase
      .channel(`owner-chats-${restaurantId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "conversations",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchConversations()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Owner chats channel error");
        }
      });

    return () => {
      subscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId]);

  async function fetchConversations() {
    const { data } = await supabase
      .from("conversations")
      .select(`
        *,
        profiles!conversations_customer_id_fkey(full_name, phone)
      `)
      .eq("restaurant_id", restaurantId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    setConversations(data || []);

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .in("conversation_id", (data || []).map(c => c.id));

    setUnreadCount(count || 0);
    setLoading(false);
  }

  return { conversations, loading, unreadCount, refetch: fetchConversations };
}


// ── Unread count for customer (badge on chat button) ─────────
export function useUnreadCount(userId) {
  const [count, setCount]   = useState(0);
  const channelRef          = useRef(null);
  const subscribedRef       = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    fetchCount();

    channelRef.current = supabase
      .channel(`unread-${userId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  async function fetchCount() {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", userId);

    if (!convs?.length) { setCount(0); return; }

    const { count: c } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convs.map(c => c.id))
      .neq("sender_id", userId)
      .eq("read", false);

    setCount(c || 0);
  }

  return count;
}