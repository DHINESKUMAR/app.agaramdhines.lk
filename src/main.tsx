import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA & Background Push
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
  
  // Register firebase messaging background worker if available
  navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
    console.debug('Firebase messaging service worker registration optional notice:', err);
  });

  // Restore badge count if exists
  try {
    const savedBadge = parseInt(localStorage.getItem('agaram_app_badge_count') || '0', 10);
    if (savedBadge > 0 && 'setAppBadge' in navigator) {
      (navigator as any).setAppBadge(savedBadge).catch(() => {});
    }
  } catch (_) {}
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
