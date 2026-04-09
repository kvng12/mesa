// src/hooks/usePushNotifications.js
// Requests notification permission and saves the FCM token to the backend.

import { useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

let app, messaging;
try {
  app       = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (e) {
  // Firebase not configured yet — skip silently
  console.warn("Firebase not configured:", e.message);
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL; // e.g. https://chowli-backend.railway.app

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId || !messaging || !BACKEND_URL) return;
    requestPermissionAndSaveToken(userId);
  }, [userId]);
}

async function requestPermissionAndSaveToken(userId) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });

    if (!token) return;

    // Save token to backend
    await fetch(`${BACKEND_URL}/fcm/save-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token }),
    });

    console.log("FCM token saved");

    // Handle foreground messages (app is open)
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icons/icon-192.png",
        });
      }
    });
  } catch (err) {
    console.warn("Push notification setup failed:", err.message);
  }
}
