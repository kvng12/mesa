// src/hooks/usePushNotifications.js
// Requests notification permission and saves the FCM token to the backend.
// Fails silently if Firebase is not configured — app works fine without it.

import { useEffect } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const VAPID_KEY   = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(v => v && v.length > 0) && VAPID_KEY;

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId || !isConfigured || !BACKEND_URL) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;
    setupPushNotifications(userId);
  }, [userId]);
}

async function setupPushNotifications(userId) {
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

    const app       = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return;

    await fetch(`${BACKEND_URL}/fcm/save-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token }),
    }).catch(() => {});

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) new Notification(title, { body: body || "", icon: "/icons/icon-192.png" });
    });

    console.log("Push notifications enabled");
  } catch (err) {
    console.warn("Push notification setup skipped:", err.message);
  }
}
