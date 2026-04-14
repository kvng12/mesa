// src/hooks/useOrders.js
// Customer-facing orders hook with realtime status updates.

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useOrders(userId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const channelRef            = useRef(null);
  const subscribedRef         = useRef(false);
  const retryTimerRef         = useRef(null);
  const pollIntervalRef       = useRef(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    if (subscribedRef.current) return;
    subscribedRef.current = true;

    fetchOrders();
    subscribeRealtime();

    // Polling fallback: re-fetch every 30s in case realtime is unavailable
    pollIntervalRef.current = setInterval(() => fetchOrders(), 30_000);

    return () => {
      subscribedRef.current = false;
      clearTimeout(retryTimerRef.current);
      clearInterval(pollIntervalRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        fulfillment,
        payment_method,
        payment_status,
        subtotal,
        note,
        delivery_address,
        created_at,
        restaurants ( id, name, icon, bg_from, bg_to ),
        order_items ( id, name, price, quantity, line_total )
      `)
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }

  function subscribeRealtime() {
    // Build the full channel with all listeners BEFORE calling .subscribe()
    // Supabase throws if you add listeners after subscribe() is called
    channelRef.current = supabase
      .channel(`customer-orders-${userId}-${Date.now()}`) // unique name prevents reuse collision
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "orders",
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id
                ? { ...o, status: payload.new.status, payment_status: payload.new.payment_status }
                : o
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "orders",
          filter: `customer_id=eq.${userId}`,
        },
        () => {
          fetchOrders(); // new order from another device — re-fetch
        }
      )
      .subscribe((status) => {
        console.log("[useOrders] realtime status:", status);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("[useOrders] channel", status, "— retrying in 5s");
          // Tear down the broken channel and reconnect after a short delay
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          retryTimerRef.current = setTimeout(() => {
            if (subscribedRef.current) subscribeRealtime();
          }, 5_000);
        }
      });
  }

  return { orders, loading, error, refetch: fetchOrders };
}
