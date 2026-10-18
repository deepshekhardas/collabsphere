import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  User,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function SubmissionsReview({ businessId }: { businessId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const path = "submissions";
    const q = query(
      collection(db, path),
      where("businessId", "==", businessId),
      where("status", "==", "pending"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSubmissions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [businessId]);

  const handleAction = async (
    submission: any,
    action: "approved" | "rejected",
  ) => {
    const path = "submissions-transaction";
    try {
      await runTransaction(db, async (transaction) => {
        const subRef = doc(db, "submissions", submission.id);
        const creatorWalletRef = doc(db, "wallets", submission.creatorId);
        const businessWalletRef = doc(db, "wallets", businessId);
        const transactionsRef = collection(db, "transactions");
        const payout = submission.payoutAmount || 50;

        transaction.update(subRef, { status: action });

        if (action === "approved") {
          // Creator balance
          const creatorWalletSnap = await transaction.get(creatorWalletRef);
          const currentCreatorBalance = creatorWalletSnap.exists()
            ? creatorWalletSnap.data().balance
            : 0;
          transaction.set(
            creatorWalletRef,
            {
              balance: currentCreatorBalance + payout,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          // Business balance
          const businessWalletSnap = await transaction.get(businessWalletRef);
          const currentBusinessBalance = businessWalletSnap.exists()
            ? businessWalletSnap.data().balance
            : 5050; // default 5050 if new
          transaction.set(
            businessWalletRef,
            {
              balance: Math.max(0, currentBusinessBalance - payout),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          // Log Transaction for Business
          const businessTxRef = doc(transactionsRef);
          transaction.set(businessTxRef, {
            userId: businessId,
            type: "payout",
            amount: -payout,
            label: `Settlement / Node ${submission.creatorId.slice(0, 8)}`,
            createdAt: serverTimestamp(),
            status: "completed",
          });

          // Log Transaction for Creator
          const creatorTxRef = doc(transactionsRef);
          transaction.set(creatorTxRef, {
            userId: submission.creatorId,
            type: "deposit",
            amount: payout,
            label: `Engagement Reward / ${businessId.slice(0, 8)}`,
            createdAt: serverTimestamp(),
            status: "completed",
          });
        }
      });

      toast.success(`Submission ${action.toUpperCase()}`, {
        description:
          action === "approved"
            ? `Protocol completed. Funds distributed across matrix.`
            : "Protocol rejected. Resource freed.",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

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
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <p className="label flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-400" />
          Queue / Integrity Verification
        </p>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          {submissions.length} Pending
        </span>
      </div>

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
              Querying Distribution Matrix
            </p>
          </motion.div>
        ) : submissions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card text-center py-16 border-dashed border-zinc-800"
          >
            <p className="text-sm font-medium text-zinc-500">
              All operational units currently synchronized.
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
            {submissions.map((sub) => (
              <motion.div
                key={sub.id}
                variants={item}
                className="card group p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-xl border border-zinc-800 flex items-center justify-center bg-zinc-900 group-hover:border-zinc-700 transition-colors shadow-inner">
                    <User className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Node
                      </span>
                      <span className="text-xs font-mono text-indigo-400">
                        {sub.creatorId.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-300">
                      Phase:{" "}
                      <span className="text-zinc-500 font-mono">
                        {sub.campaignId?.slice(0, 8) || "UNKNOWN"}
                      </span>
                    </p>
                    <a
                      href={sub.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Inspect Content
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 text-rose-400 border-rose-900/50 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => handleAction(sub, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Nullify
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    onClick={() => handleAction(sub, "approved")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verify & Liquify
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
