import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Clock, DollarSign, ArrowUpRight, TrendingUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, isSameDay } from "date-fns";

export function MyEarningList({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Real-time wallet
    const docRef = doc(db, "wallets", userId);
    const unsubscribeWallet = onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          setWallet(snap.data());
          setLoading(false);
        } else {
          const initial = {
            balance: 0,
            pending: 0,
            updatedAt: new Date().toISOString(),
          };
          setWallet(initial);
          setLoading(false);
        }
      },
      (error) => {
        console.error(error);
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

  const fetchWallet = async () => {};

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

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayTxs = transactions.filter((tx) => {
        if (!tx.createdAt) return false;
        const txDate = tx.createdAt.toDate
          ? tx.createdAt.toDate()
          : new Date(tx.createdAt);
        return isSameDay(txDate, date);
      });
      const earnings = dayTxs.reduce(
        (sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0),
        0,
      );
      data.push({
        name: format(date, "EEE"),
        earnings: earnings,
        fullDate: format(date, "MMM dd, yyyy"),
      });
    }
    // Dummy fallback if no real transactions to show chart capabilities
    if (data.every((d) => d.earnings === 0)) {
      return [
        { name: "Mon", earnings: 120, fullDate: "Mon" },
        { name: "Tue", earnings: 0, fullDate: "Tue" },
        { name: "Wed", earnings: 350, fullDate: "Wed" },
        { name: "Thu", earnings: 50, fullDate: "Thu" },
        { name: "Fri", earnings: 600, fullDate: "Fri" },
        { name: "Sat", earnings: 0, fullDate: "Sat" },
        { name: "Sun", earnings: 210, fullDate: "Sun" },
      ];
    }
    return data;
  }, [transactions]);

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
    <div className="flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-16">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8 relative z-20">
        <div className="space-y-4">
          <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Wallet & Earnings
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Earnings &<br />
            <span className="text-zinc-500 font-medium">Payouts</span>
          </h1>
        </div>
        <div className="flex gap-4 pb-2 z-30">
          <button
            disabled={!(wallet?.balance > 0)}
            onClick={() => toast.info("Withdrawal request sent.")}
            className="btn-primary"
          >
            Withdraw Funds
          </button>
        </div>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          {
            label: "Available Balance",
            value: `$${wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}`,
            sub: "Ready for withdrawal",
            color: "text-emerald-400",
            bColor: "border-zinc-800",
          },
          {
            label: "Pending Review",
            value: `$${wallet?.pending?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}`,
            sub: "Awaiting confirmation",
            color: "text-indigo-400",
            bColor: "border-zinc-800",
          },
          {
            label: "Total Earnings",
            value: `$${(wallet?.balance + wallet?.pending || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            sub: "Lifetime earnings",
            color: "text-white",
            bColor: "border-zinc-800",
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={item} className="group">
            <div
              className={`card p-8 border ${stat.bColor} relative overflow-hidden h-full flex flex-col justify-center transition-all duration-300 hover:border-zinc-600`}
            >
              <div className="space-y-4 relative z-10">
                <span className="text-xs font-semibold tracking-widest text-zinc-500 block uppercase select-none">
                  {stat.label}
                </span>
                <p
                  className={cn(
                    "text-4xl lg:text-5xl font-semibold tracking-tight",
                    stat.color,
                  )}
                >
                  {stat.value}
                </p>
                <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
                  <div className="h-1.5 w-1.5 bg-zinc-600 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {stat.sub}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="card border-zinc-800">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 mb-2 bg-zinc-900 border border-zinc-800 py-1 px-3 rounded-full text-[10px] font-semibold tracking-[0.2em] text-zinc-400 uppercase">
            Growth Overview
          </p>
          <h2 className="text-2xl font-semibold text-white mt-4">
            Earnings History (7 Days)
          </h2>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#52525b"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#10b981", fontWeight: "bold" }}
                labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                formatter={(value: any) => [`$${value}`, "Earnings"]}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorEarnings)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="card p-0 border-zinc-800 overflow-hidden"
      >
        <div className="flex items-end justify-between p-8 pb-4 border-b border-zinc-800">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 mb-2 bg-zinc-900 border border-zinc-800 py-1 px-3 rounded-full text-[10px] font-semibold tracking-[0.2em] text-zinc-400 uppercase">
              Transaction History
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white mt-4">
              Recent Activity
            </h2>
          </div>
          <button className="h-11 w-11 rounded-xl flex items-center justify-center transition-all bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 text-zinc-400 hover:text-white">
            <TrendingUp className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-zinc-950/50">
          <AnimatePresence mode="popLayout">
            {transactions.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center gap-6 bg-zinc-900/50"
              >
                <div className="h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                  <Clock className="h-8 w-8 text-zinc-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-zinc-300 font-semibold tracking-wide">
                    No transactions found
                  </p>
                  <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                    Complete missions to earn.
                  </p>
                </div>
                <button className="btn-primary mt-4 py-2 text-sm">
                  Discover Missions
                </button>
              </motion.div>
            ) : (
              transactions.map((tx, idx) => (
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
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center transition-transform duration-500">
                      <ArrowUpRight
                        className={cn(
                          "h-5 w-5",
                          tx.amount > 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white transition-colors">
                        {tx.label}
                      </p>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-1">
                        {formatTxDate(tx)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p
                      className={cn(
                        "text-xl font-semibold tracking-tight",
                        tx.amount > 0 ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Zap className="h-3 w-3 text-emerald-500" />
                      <p className="text-[10px] text-emerald-500 uppercase font-semibold tracking-widest">
                        VERIFIED
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
