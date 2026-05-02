import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export function useRealtimeNotifications(grade: string | undefined, onNewNotification?: (notif: any) => void) {
  useEffect(() => {
    if (!isFirebaseConfigured || !grade) return;

    // Request permission for browser notifications - though this might be better on a user click
    if ('Notification' in window && Notification.permission === 'default') {
      const askPermission = () => {
        Notification.requestPermission();
        document.removeEventListener('click', askPermission);
      };
      document.addEventListener('click', askPermission);
    }

    // Get last seen timestamp from localStorage
    const lastSeenKey = `last_notification_seen_${grade}`;
    const badgeKey = `app_badge_count_${grade}`;
    
    // Initial badge from storage
    const currentBadge = parseInt(localStorage.getItem(badgeKey) || "0");
    if (currentBadge > 0 && 'navigator' in window && 'setAppBadge' in navigator) {
      (navigator as any).setAppBadge(currentBadge).catch(() => {});
    }

    // Create a timestamp to only trigger alerts for truly "new" notifications arriving while app is open
    const activeSessionTime = new Date(Date.now() - 60000).toISOString();

    const q = query(
      collection(db, 'notifications'),
      where('grade', 'in', [grade, 'Public', 'public', 'All', 'all']),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          if (notification.createdAt && notification.createdAt >= activeSessionTime) {
            console.log("Real-time notification received:", notification);
            
            // Increment and set badge
            const newBadge = parseInt(localStorage.getItem(badgeKey) || "0") + 1;
            localStorage.setItem(badgeKey, newBadge.toString());
            if ('navigator' in window && 'setAppBadge' in navigator) {
              (navigator as any).setAppBadge(newBadge).catch(() => {});
            }

            // Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const n = new Notification(notification.title, {
                  body: notification.message,
                  icon: '/logo.png',
                  tag: notification.id, // prevent duplicates
                  renotify: true
                } as any);
                n.onclick = () => {
                  window.focus();
                  n.close();
                };
              } catch (e) {
                console.error("Failed to show browser notification", e);
              }
            }

            // Vibration if supported
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            // Callback for UI update
            if (onNewNotification) {
              onNewNotification(notification);
            }
          }
        }
      });
    }, (error) => {
      console.error("Notification listener error:", error);
      // If index is missing, error will provide the link to create it
    });

    return () => unsubscribe();
  }, [grade]);
}
