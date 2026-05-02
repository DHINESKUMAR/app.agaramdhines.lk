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

    const q = query(
      collection(db, 'notifications'),
      where('grade', 'in', [grade, 'Public', 'public']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Check if it's a recent notification (not an old one from history)
          const createdAt = new Date(notification.createdAt).getTime();
          const now = new Date().getTime();
          
          // If the notification is newer than 30 seconds ago, show it
          if (now - createdAt < 30000) {
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
    });

    return () => unsubscribe();
  }, [grade]);
}
