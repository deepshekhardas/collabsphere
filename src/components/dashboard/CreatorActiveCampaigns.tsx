import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function CreatorActiveCampaigns() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [campaignsCache, setCampaignsCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = "submissions";
    const q = query(
      collection(db, path),
      where("creatorId", "==", auth.currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const subs = snap.docs.map((entry) => {
          const data = entry.data();
          return { ...data, id: entry.id, campaignId: typeof data.campaignId === "string" ? data.campaignId : "" };
        });
        setSubmissions(subs);

        // Fetch campaign details for these submissions
        const newCache = { ...campaignsCache };
        for (const sub of subs) {
          if (!sub.campaignId) continue;
          if (!newCache[sub.campaignId]) {
            try {
              const campSnap = await getDoc(
                doc(db, "campaigns", sub.campaignId),
              );
              if (campSnap.exists()) {
                newCache[sub.campaignId] = campSnap.data();
              }
            } catch (err) {
              console.error("Error fetching campaign:", err);
            }
          }
        }
        setCampaignsCache(newCache);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-zinc-800 pb-8">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-2">
          Active Missions
        </h1>
        <p className="text-zinc-400">
          Track your current submissions and payouts.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30"
          >
            <Loader2 className="animate-spin h-6 w-6 text-zinc-500" />
            <p className="text-sm font-medium text-zinc-400">
              Loading tracking data...
            </p>
          </motion.div>
        ) : submissions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center py-16 border-dashed border-zinc-800 bg-zinc-900/50"
          >
            <p className="text-sm font-medium text-zinc-500 mb-4">
              No active missions tracked.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6"
          >
            {submissions.map((sub) => {
              const camp = campaignsCache[sub.campaignId];
              return (
                <motion.div
                  key={sub.id}
                  variants={item}
                  className="card p-6 border-zinc-800 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-white">
                          {camp?.title || "Campaign Details Loading..."}
                        </h2>
                        {sub.status === "pending" && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Review
                          </span>
                        )}
                        {sub.status === "approved" && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved &
                            Paid
                          </span>
                        )}
                        {sub.status === "rejected" && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>

                      <a
                        href={sub.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" /> View Submitted
                        Content
                      </a>
                    </div>

                    <div className="flex items-center gap-8 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                          Potential Payout
                        </span>
                        <span className="text-xl font-bold text-emerald-400">
                          ${sub.payoutAmount || camp?.payoutPerCreator || 0}
                        </span>
                      </div>
                      <div className="h-10 w-px bg-zinc-800"></div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                          Date Submitted
                        </span>
                        <span className="text-sm font-medium text-zinc-300">
                          {sub.createdAt?.toDate
                            ? sub.createdAt.toDate().toLocaleDateString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
