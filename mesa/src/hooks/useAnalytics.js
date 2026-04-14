// src/hooks/useAnalytics.js
// Restaurant owner analytics — daily orders, revenue, top items

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAnalytics(restaurantId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [period, setPeriod]   = useState("7d"); // "7d" | "30d" | "all"

  useEffect(() => {
    if (!restaurantId) return;
    fetchAnalytics();
  }, [restaurantId, period]);

  async function fetchAnalytics() {
    setLoading(true);

    const now   = new Date();
    const since = period === "7d"
      ? new Date(now - 7  * 86400000).toISOString()
      : period === "30d"
      ? new Date(now - 30 * 86400000).toISOString()
      : new Date("2020-01-01").toISOString();

    // Fetch completed + paid orders in period
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select(`id, subtotal, status, created_at, order_items(name, quantity, price, line_total)`)
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setError(null);
    const all = orders || [];

    // Total revenue (completed + delivered orders)
    const completedOrders = all.filter(o => o.status === "completed" || o.status === "delivered");
    const totalRevenue    = completedOrders.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalOrders     = all.length;
    const completedCount  = completedOrders.length;
    const cancelledCount  = all.filter(o => o.status === "cancelled").length;
    const completionRate  = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;

    // Daily revenue breakdown
    const dailyMap = {};
    completedOrders.forEach(o => {
      const day = o.created_at.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(o.subtotal);
    });
    const dailyRevenue = Object.entries(dailyMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top menu items by quantity sold
    const itemMap = {};
    completedOrders.forEach(o => {
      (o.order_items || []).forEach(item => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        itemMap[item.name].quantity += item.quantity;
        itemMap[item.name].revenue  += Number(item.line_total || item.price * item.quantity);
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Average order value
    const avgOrderValue = completedCount > 0
      ? Math.round(totalRevenue / completedCount)
      : 0;

    // Today's numbers
    const todayStr    = now.toISOString().slice(0, 10);
    const todayOrders = all.filter(o => o.created_at.startsWith(todayStr));
    const todayRev    = todayOrders.filter(o => o.status === "completed" || o.status === "delivered")
      .reduce((s, o) => s + Number(o.subtotal), 0);

    setData({
      totalRevenue,
      totalOrders,
      completedCount,
      cancelledCount,
      completionRate,
      avgOrderValue,
      todayOrders: todayOrders.length,
      todayRevenue: todayRev,
      dailyRevenue,
      topItems,
    });
    setLoading(false);
  }

  return { data, loading, error, period, setPeriod, refetch: fetchAnalytics };
}
