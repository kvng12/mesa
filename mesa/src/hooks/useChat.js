// src/hooks/useChat.js
// In-app chat between customers and restaurants.

// ─────────────────────────────────────────────────────────────
// SQL that must be run once in Supabase before this works:
//
//   ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
//   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
//   ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ── Single conversation (customer ↔ restaurant) ──────────────
// userId       – used to LOOK UP the conversation (customer_id column)
// restaurantId – used to look up the conversation (restaurant_id column)
// conversationId – skip lookup, open a specific conversation directly
// senderIdOverride – who actually sends the message (owner's real user.id)
export function useChat({
  userId,
  restaurantId,
  conversationId: forcedConvId = null,
  senderIdOverride = null,
}) {
  const [messages, setMessages]         = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const channelRef    = useRef(null);
  const subscribedRef = useRef(false);

  // The user who actually writes the messages (owner sends as themselves, not as customer)
  const actualSenderId = senderIdOverride || userId;

  useEffect(() => {
    if (!userId) return;
    if (!forcedConvId && !restaurantId) return;
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
  }, [userId, restaurantId, forcedConvId]);

  async function initConversation() {
    setLoading(true);

    let conv = null;

    if (forcedConvId) {
      // Owner opening a specific conversation by ID — direct lookup, no create
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", forcedConvId)
        .single();
      conv = data;
    } else {
      // Customer opening their own chat — find or create by customer_id + restaurant_id
      let { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_id", userId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (!data) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({ customer_id: userId, restaurant_id: restaurantId })
          .select()
          .single();
        data = newConv;
      }
      conv = data;
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

    await markRead(conv.id);

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
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          markRead(conv.id);
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
        sender_id:       actualSenderId,   // owner sends as themselves
        text:            text.trim(),
      });

    if (!error) {
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message:    text.trim(),
        })
        .eq("id", conversation.id);
    }

    setSending(false);
    return { error };
  }

  // Mark all messages in this conversation as read, excluding ones sent by this user
  async function markRead(convId) {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", convId)
      .neq("sender_id", actualSenderId)
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
      .subscribe();

    return () => {
      subscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId]);

  async function fetchConversations() {
    // Use profiles!customer_id join (correct FK reference)
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        profiles!customer_id(full_name, phone)
      `)
      .eq("restaurant_id", restaurantId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      setLoading(false);
      return;
    }

    const convs = data || [];
    setConversations(convs);

    if (convs.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .in("conversation_id", convs.map(c => c.id));
      setUnreadCount(count || 0);
    } else {
      setUnreadCount(0);
    }

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
