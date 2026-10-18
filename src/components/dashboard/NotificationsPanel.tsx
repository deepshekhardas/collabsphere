import React from "react";
import { Bell, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications = [],
  markAllAsRead,
}: {
  isOpen: boolean;
  onClose: () => void;
  notifications?: any[];
  markAllAsRead?: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col"
          >
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">
                  Notifications
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Bell className="w-8 h-8 text-zinc-700 mb-4" />
                  <p className="text-sm font-medium text-zinc-400">
                    All caught up!
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Check back later for new alerts.
                  </p>
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`p-4 bg-zinc-900 border ${notif.read ? "border-transparent opacity-70" : "border-zinc-700"} rounded-xl relative overflow-hidden`}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                    )}
                    <h4 className="text-sm font-medium text-white mb-1">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-3 block">
                      {notif.createdAt?.toDate
                        ? notif.createdAt.toDate().toLocaleString()
                        : "Just now"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && notifications.some((n) => !n.read) && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  onClick={markAllAsRead}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
