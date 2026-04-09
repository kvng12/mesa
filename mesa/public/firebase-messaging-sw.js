// public/firebase-messaging-sw.js
// This file MUST be at the root of your public folder

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Replace with your Firebase config values
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "YOUR_API_KEY",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "YOUR_PROJECT.firebaseapp.com",
  projectId:         self.FIREBASE_PROJECT_ID         || "YOUR_PROJECT_ID",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "YOUR_PROJECT.appspot.com",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId:             self.FIREBASE_APP_ID             || "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Background message handler — shows notification when app is closed
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || "Chowli", {
    body: body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.type || "chowli-notification",
    data,
    actions: data.type === "order_status"
      ? [{ action: "view", title: "View Order" }]
      : [],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  let url = "/";
  if (data.type === "order_status" || data.type === "new_order") url = "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
