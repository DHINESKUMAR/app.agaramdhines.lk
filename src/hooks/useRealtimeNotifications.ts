import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export function useRealtimeNotifications(grade: string | undefined, onNewNotification?: (notif: any) => void) {
  useEffect(() => {
    if (!isFirebaseConfigured || !grade) return;

    // Request permission for browser notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Start listening for notifications created recently (within last 10 minutes)
    // to handle clock skews between admin and student
    const mountTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const q = query(
      collection(db, 'notifications'),
      where('grade', 'in', [grade, 'Public', 'public'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Only show if notification was created after our (buffered) mount time
          if (notification.createdAt && notification.createdAt >= mountTime) {
            console.log("New notification received:", notification);
            
            // App Badge (System level)
            if ('navigator' in window && 'setAppBadge' in navigator) {
              (navigator as any).setAppBadge(1).catch((error: any) => {
                console.error('Failed to set app badge:', error);
              });
            }

            // Browser Notification (System level)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/pwa-192x192.png'
              });
            }

            // Callback for UI update (Home dashboard badge)
            if (onNewNotification) {
              onNewNotification(notification);
            }
          }
        }
      });
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [grade]);
}
