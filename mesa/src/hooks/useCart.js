// src/hooks/useCart.js
// Cart is kept in local state (no DB until checkout).
// One restaurant at a time — adding from a different restaurant
// prompts the user to clear and start fresh.
//
// ── SQL to broaden the payment_status check constraint ───────
//   ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
//   ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
//     CHECK (payment_status IN ('pending', 'paid', 'cash', 'failed', 'refunded'));
// ────────────────────────────────────────────────────────────

import { useState } from "react";
import { supabase } from "../lib/supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export function useCart() {
  const [items, setItems]               = useState([]);   // { menuItem, quantity }
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);

  // Returns true if cart belongs to a different restaurant
  function isDifferentRestaurant(rid) {
    return restaurantId && restaurantId !== rid;
  }

  // Add one unit of a menu item. Pass the full restaurant object too.
  function addItem(menuItem, restaurant) {
    if (isDifferentRestaurant(restaurant.id)) return false; // caller must confirm first

    setRestaurantId(restaurant.id);
    setRestaurantName(restaurant.name);
    setItems(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === menuItem.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    return true;
  }

  function removeItem(menuItemId) {
    setItems(prev => {
      const updated = prev.map(i => i.menuItem.id === menuItemId
        ? { ...i, quantity: i.quantity - 1 }
        : i
      ).filter(i => i.quantity > 0);
      if (updated.length === 0) {
        setRestaurantId(null);
        setRestaurantName("");
      }
      return updated;
    });
  }

  function clearCart() {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName("");
    setError(null);
  }

  function getQuantity(menuItemId) {
    return items.find(i => i.menuItem.id === menuItemId)?.quantity || 0;
  }

  const totalItems  = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal    = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);

  // Place the order — inserts into orders + order_items
  async function placeOrder({ fulfillment, paymentMethod, deliveryAddress, note, userId, paystackReference }) {
    if (!items.length || !restaurantId || !userId) return { error: "Missing data" };

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id:       userId,
          restaurant_id:     restaurantId,
          fulfillment,
          payment_method:    paymentMethod,
          payment_status:    "pending",   // cash orders stay "pending" until fulfilled; online transitions to "paid" after Paystack callback
          delivery_address:  fulfillment === "delivery" ? deliveryAddress : null,
          note:              note || null,
          paystack_reference: paystackReference || null,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert all line items
      const lineItems = items.map(i => ({
        order_id:     order.id,
        menu_item_id: i.menuItem.id,
        name:         i.menuItem.name,
        price:        i.menuItem.price,
        quantity:     i.quantity,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(lineItems);

      if (itemsErr) throw itemsErr;

      // Notify restaurant owner for cash orders (online orders are notified via Paystack webhook)
      if (paymentMethod === "cash") {
        console.log("[WhatsApp] VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);
        if (!BACKEND_URL) {
          console.warn("[notify] VITE_BACKEND_URL is not set — skipping notifications");
        } else {
          // FCM push notification
          const notifyPayload = { orderId: order.id, restaurantId };
          console.log("[notify/new-order] calling", `${BACKEND_URL}/notify/new-order`, notifyPayload);
          fetch(`${BACKEND_URL}/notify/new-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notifyPayload),
          })
            .then(r => r.json().then(body => console.log("[notify/new-order] response:", r.status, body)))
            .catch(err => console.error("[notify/new-order] fetch failed:", err.message));

          // WhatsApp notification to restaurant owner
          console.log("[WhatsApp] calling...");
          fetch(`${BACKEND_URL}/notify/whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, restaurantId }),
          })
            .then(r => r.json().then(result => console.log("[WhatsApp] response:", r.status, result)))
            .catch(err => console.error("[notify/whatsapp] fetch failed:", err.message));
        }
      }

      clearCart();
      setSubmitting(false);
      return { data: order, error: null };

    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      return { data: null, error: err.message };
    }
  }

  return {
    items, restaurantId, restaurantName,
    totalItems, subtotal,
    submitting, error,
    addItem, removeItem, clearCart, getQuantity,
    isDifferentRestaurant, placeOrder,
  };
}


// ── Customer's order history ─────────────────────────────────
export function useOrders(userId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchOrders() {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(`*, restaurants(name, icon), order_items(*)`)
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setOrders(data || []);
    setLoading(false);
  }

  return { orders, loading, fetchOrders };
}


// ── Owner: incoming orders ───────────────────────────────────
export function useIncomingOrders(restaurantId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchOrders() {
    if (!restaurantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(`*, profiles(full_name, phone), order_items(*)`)
      .eq("restaurant_id", restaurantId)
      .not("status", "in", '("completed","cancelled","delivered")')
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(orderId, status) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    fetchOrders();
  }

  return { orders, loading, fetchOrders, updateStatus };
}