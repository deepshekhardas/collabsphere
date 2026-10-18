import { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as any,
        );
        notifs.sort((a, b) => {
          const aTime = a.createdAt?.toDate
            ? a.createdAt.toDate().getTime()
            : 0;
          const bTime = b.createdAt?.toDate
            ? b.createdAt.toDate().getTime()
            : 0;
          return bTime - aTime;
        });
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "notifications");
      },
    );

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const markAllAsRead = async () => {
    if (!auth.currentUser || unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
    try {
      await batch.commit();
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  return { notifications, unreadCount, markAllAsRead };
}
