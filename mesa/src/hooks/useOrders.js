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
  const retryingRef           = useRef(false); // guard against re-entrant teardown
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
      retryingRef.current   = true; // prevent any in-flight callback from scheduling a retry
      clearTimeout(retryTimerRef.current);
      clearInterval(pollIntervalRef.current);
      const ch = channelRef.current;
      channelRef.current = null;    // null before removeChannel to stop re-entrant callbacks
      if (ch) supabase.removeChannel(ch);
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
        confirmed_at,
        auto_release_at,
        disputed,
        pickup_otp,
        pickup_otp_verified,
        prep_time_minutes,
        ready_at,
        restaurant_id,
        restaurants ( id, name, icon, bg_from, bg_to, latitude, longitude ),
        order_items ( id, menu_item_id, name, price, quantity, line_total )
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
                ? { ...o, status: payload.new.status, payment_status: payload.new.payment_status, confirmed_at: payload.new.confirmed_at, auto_release_at: payload.new.auto_release_at, disputed: payload.new.disputed, pickup_otp: payload.new.pickup_otp, pickup_otp_verified: payload.new.pickup_otp_verified, prep_time_minutes: payload.new.prep_time_minutes, ready_at: payload.new.ready_at }
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
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // Guard: if we're already tearing down, don't recurse.
          // removeChannel() can synchronously fire this callback with CLOSED,
          // causing infinite recursion if we don't bail out here.
          if (retryingRef.current) return;
          retryingRef.current = true;

          // Null the ref BEFORE calling removeChannel so any re-entrant
          // CLOSED callbacks see null and skip the removeChannel call.
          const ch = channelRef.current;
          channelRef.current = null;
          if (ch) supabase.removeChannel(ch);

          retryTimerRef.current = setTimeout(() => {
            retryingRef.current = false;
            if (subscribedRef.current) subscribeRealtime();
          }, 5_000);
        }
      });
  }

  return { orders, loading, error, refetch: fetchOrders };
}
