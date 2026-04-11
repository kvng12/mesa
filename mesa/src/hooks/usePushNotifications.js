// src/hooks/usePushNotifications.js
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
    if (!userId || !isConfigured || !BACKEND_URL) {
      console.log("[Push] Skipping — missing config or userId");
      return;
    }
    if (!("Notification" in window)) {
      console.log("[Push] Notifications not supported");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      console.log("[Push] Service workers not supported");
      return;
    }

    setupPushNotifications(userId);
  }, [userId]);
}

async function setupPushNotifications(userId) {
  try {
    console.log("[Push] Starting setup for user:", userId);

    // Step 1 — Request permission
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    console.log("[Push] Permission:", permission);
    if (permission !== "granted") {
      console.log("[Push] Permission denied — stopping");
      return;
    }

    // Step 2 — Import Firebase dynamically
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
    console.log("[Push] Firebase imported");

    // Step 3 — Initialize Firebase
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    console.log("[Push] Firebase initialized");

    // Step 4 — Register service worker explicitly
    let swReg;
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      console.log("[Push] Service worker registered:", swReg.scope);
    } catch (swErr) {
      console.error("[Push] Service worker failed:", swErr.message);
      return;
    }

    // Step 5 — Get FCM token
    let token;
    try {
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      console.log("[Push] FCM token obtained:", token ? token.slice(0, 20) + "..." : "null");
    } catch (tokenErr) {
      console.error("[Push] Token error:", tokenErr.message);
      return;
    }

    if (!token) {
      console.error("[Push] No token returned from Firebase");
      return;
    }

    // Step 6 — Save token to backend
    try {
      const resp = await fetch(`${BACKEND_URL}/fcm/save-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token }),
      });
      const result = await resp.json();
      console.log("[Push] Token saved to backend:", result);
    } catch (saveErr) {
      console.error("[Push] Failed to save token:", saveErr.message);
      return;
    }

    // Step 7 — Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log("[Push] Foreground message:", payload);
      const { title, body } = payload.notification || {};
      if (title) {
        new Notification(title, {
          body: body || "",
          icon: "/icons/icon-192.png",
        });
      }
    });

    console.log("[Push] Setup complete ✓");
  } catch (err) {
    console.error("[Push] Setup failed:", err.message);
  }
}