import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import {
  CreditCard,
  ArrowUpRight,
  History,
  Zap,
  Shield,
  Network,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function Wallet({ userId }: { userId: string }) {
  // Mock flow used instead of stripe
  const [isProcessing, setIsProcessing] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [showLedger, setShowLedger] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isIntentLoading, setIsIntentLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Real-time wallet
    const docRef = doc(db, "wallets", userId);
    const unsubscribeWallet = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setWallet(snap.data());
          setLoading(false);
        } else {
          const initial = {
            balance: 5050,
            pending: 0,
            updatedAt: new Date().toISOString(),
          };
          // Just set locally for this session if it doesn't exist yet, it'll create when needed.
          setWallet(initial);
          setLoading(false);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `wallets/${userId}`);
        setLoading(false);
      },
    );

    // Real-time transactions
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );

    const unsubscribeTx = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "transactions");
      },
    );

    return () => {
      unsubscribeWallet();
      unsubscribeTx();
    };
  }, [userId]);

  const fetchWallet = async () => {
    // Kept to not break handleAddFunds calling it
  };

  const initiateTopUp = async () => {
    const val = Number(amount);
    if (isNaN(val) || val <= 0 || val > 100000) {
      toast.error("Amount must be between 0 and 100,000");
      return;
    }

    setIsIntentLoading(true);
    // Simulate network delay for mock flow
    setTimeout(() => {
      setClientSecret("mock_secret_" + Math.random());
      setIsIntentLoading(false);
    }, 800);
  };

  const handlePaymentSuccess = async () => {
    const val = Number(amount);
    const path = `wallets/${userId}`;

    // Close modal
    setClientSecret(null);
    setAmount("");

    try {
      const newBalance = (wallet?.balance || 0) + val;
      await updateDoc(doc(db, "wallets", userId), {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      });

      // Add transaction record
      await addDoc(collection(db, "transactions"), {
        userId,
        type: "deposit",
        amount: val,
        label: "Institutional Capital Flux",
        createdAt: serverTimestamp(),
        status: "completed",
      });

      setWallet({ ...wallet, balance: newBalance });
      toast.success(`Fiscal Liquidity Synced.`, {
        description: `Matrix balance increased by $${val.toLocaleString()}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const formatTxDate = (tx: any) => {
    if (!tx.createdAt) return "SYNCHRONIZING...";
    const date = tx.createdAt.toDate
      ? tx.createdAt.toDate()
      : new Date(tx.createdAt);
    return (
      date
        .toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .toUpperCase() + " GMT"
    );
  };

  return (
    <div className="flex flex-col space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8"
      >
        <div className="space-y-4">
          <p className="label flex items-center gap-2 text-indigo-400">
            <Shield className="h-4 w-4" />
            Institutional Treasury / Section 03
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Capital
            <br />
            <span className="text-zinc-500 text-3xl sm:text-4xl">
              Allocation
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            System Security Matrix
          </span>
          <span className="text-2xl font-bold tracking-tight text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
            E2E_ENCRYPTED
          </span>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 bg-zinc-900 border-white/[0.05] relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-inner relative">
                  <CreditCard className="h-6 w-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
                  Liquid Assets
                </span>
              </div>
              <div className="pt-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Protocol Balance
                </p>
                <p className="text-5xl font-bold tracking-tight text-white drop-shadow-md">
                  $
                  {wallet?.balance?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  }) || "0.00"}
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Settlement Index: T+0
                </span>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-8 space-y-6 bg-black/40 border-white/5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Modify Capital Flux
            </p>
            <div className="space-y-6">
              <div className="relative z-20">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const val = Math.max(
                      0,
                      Math.min(100000, Number(e.target.value)),
                    );
                    if (e.target.value === "") {
                      setAmount("");
                    } else {
                      setAmount(val.toString());
                    }
                  }}
                  className="w-full bg-transparent border-b-2 border-white/10 text-4xl font-bold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 focus:pb-2 text-center transition-all"
                />
              </div>
              <button
                onClick={initiateTopUp}
                disabled={
                  isIntentLoading ||
                  !amount ||
                  Number(amount) <= 0 ||
                  Number(amount) > 100000
                }
                className="btn-primary w-full h-12 flex justify-center items-center shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)]"
              >
                {isIntentLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Execute Flux Protocol"
                )}
              </button>
            </div>
          </motion.div>
        </div>

        <Dialog
          open={!!clientSecret}
          onOpenChange={(open) => {
            if (!open) setClientSecret(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 shadow-[0_0_50px_-12px_rgb(0,0,0)]">
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold">
                Secure Payment Protocol
              </DialogTitle>
              <DialogDescription className="text-zinc-400 font-medium tracking-wide">
                Awaiting authorization for $
                {Number(amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
                .
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-center text-zinc-400 text-sm font-medium">
                Notice: System is in sandbox mode. This is a secure mock
                transaction. Not real funds are moved.
              </div>
              <button
                onClick={handlePaymentSuccess}
                className="btn-primary w-full h-12 flex justify-center items-center font-bold tracking-wide shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] bg-emerald-500 hover:bg-emerald-400 text-black border-none"
              >
                Confirm Secure Mock Payment
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-0 overflow-hidden h-full flex flex-col"
          >
            <div className="p-8 pb-4 flex justify-between items-end border-b border-white/[0.05]">
              <div>
                <p className="inline-flex items-center gap-2 mb-2 bg-white/[0.02] border border-white/5 py-1 px-3 rounded-full text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                  Transaction Matrix
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white mt-4 mb-2 drop-shadow-sm">
                  Verified History
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowLedger(!showLedger);
                  if (transactions.length <= 5) {
                    toast.info("Matrix Synced", {
                      description:
                        "All available ledger entries are currently displayed.",
                    });
                  } else {
                    toast.info(
                      showLedger ? "Ledger Collapsed" : "Ledger Expanded",
                    );
                  }
                }}
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 active:scale-95 ${showLedger ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "text-zinc-400 hover:text-zinc-100"}`}
              >
                <History className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 bg-gradient-to-b from-transparent to-black/20">
              <AnimatePresence mode="popLayout">
                {(showLedger ? transactions : transactions.slice(0, 5)).map(
                  (tx, idx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.98 }}
                      transition={{
                        delay: idx * 0.05,
                        type: "spring",
                        damping: 25,
                        stiffness: 200,
                      }}
                      className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300 group/item relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover/item:opacity-100 pointer-events-none data-[negative=true]:to-rose-500/5"
                        data-negative={tx.amount < 0}
                      ></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-xl border border-white/5 bg-zinc-900 shadow-inner flex items-center justify-center group-hover/item:scale-105 transition-transform duration-500">
                          <ArrowUpRight
                            className={cn(
                              "h-5 w-5 drop-shadow-[0_0_8px_currentColor]",
                              tx.amount > 0
                                ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                : "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]",
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-zinc-200 group-hover/item:text-white transition-colors">
                            {tx.label}
                          </p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">
                            {formatTxDate(tx)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right relative z-10">
                        <p
                          className={cn(
                            "text-xl font-bold tracking-tight drop-shadow-sm",
                            tx.amount > 0
                              ? "text-emerald-400"
                              : "text-rose-400",
                          )}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end mt-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <Zap className="h-3 w-3 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <p className="text-[9px] text-emerald-500 uppercase font-black tracking-[0.2em] drop-shadow-md">
                            VERIFIED
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ),
                )}
              </AnimatePresence>

              {transactions.length > 5 && (
                <button
                  onClick={() => setShowLedger(!showLedger)}
                  className="w-full mt-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-2xl border border-dashed border-white/10 transition-colors"
                >
                  {showLedger ? "Collapse Ledger" : "View Full Matrix"}
                </button>
              )}

              {transactions.length === 0 && (
                <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    No Transactional Nodes Identified
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
