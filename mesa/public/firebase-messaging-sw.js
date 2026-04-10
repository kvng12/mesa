// public/firebase-messaging-sw.js
// This file MUST be at the root of your public folder

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Replace with your Firebase config values
firebase.initializeApp({
  apiKey: "AIzaSyAtFv7xwXR8UYSdmCeR0vJZvCbwMCO-fXo",
  authDomain: "chowli.firebaseapp.com",
  projectId: "chowli",
  storageBucket: "chowli.firebasestorage.app",
  messagingSenderId: "299109164372",
  appId: "1:299109164372:web:e8013ba62a4ad4fba794c1",
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
