import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export function useRealtimeNotifications(grade: string | undefined) {
  useEffect(() => {
    if (!isFirebaseConfigured || !grade) return;

    // Request permission for browser notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Start listening for notifications created after this moment
    const mountTime = new Date().toISOString();

    const q = query(
      collection(db, 'notifications'),
      where('grade', 'in', [grade, 'Public', 'public'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Only show if notification was created after mount
          if (notification.createdAt >= mountTime) {
            // Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/pwa-192x192.png'
              });
            }

            // App Badge
            if ('navigator' in window && 'setAppBadge' in navigator) {
              (navigator as any).setAppBadge(1).catch((error: any) => {
                console.error('Failed to set app badge:', error);
              });
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
