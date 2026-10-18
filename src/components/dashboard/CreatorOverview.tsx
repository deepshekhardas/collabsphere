import React from "react";
import {
  Wallet,
  Star,
  TrendingUp,
  CheckCircle,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

const engagementData = [
  { name: "W1", value: 3.2 },
  { name: "W2", value: 4.8 },
  { name: "W3", value: 2.1 },
  { name: "W4", value: 5.4 },
  { name: "W5", value: 6.2 },
  { name: "W6", value: 4.5 },
  { name: "W7", value: 7.1 },
];

interface CreatorOverviewProps {
  profile: any;
}

export function CreatorOverview({ profile }: CreatorOverviewProps) {
  const stats = [
    {
      label: "Available Balance",
      value: `$${profile?.earnings || "5,420.00"}`,
      sub: "+12% this month",
      icon: Wallet,
      color: "text-emerald-400",
    },
    {
      label: "Brand Rating",
      value: `${profile?.rating || "4.9"}`,
      sub: "Top Creator",
      icon: Star,
      color: "text-indigo-400",
    },
    {
      label: "Active Campaigns",
      value: "03",
      sub: "0 pending review",
      icon: CheckCircle,
      color: "text-blue-400",
    },
    {
      label: "Total Reach",
      value: `${profile?.audienceSize || "124K"}`,
      sub: "Across platforms",
      icon: TrendingUp,
      color: "text-rose-400",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8">
        <div className="space-y-4">
          <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
            Creator Dashboard
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Welcome back,
            <br />
            <span className="text-zinc-500 font-medium">
              {profile?.displayName || "@User"}
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1 pb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 select-none">
            Platform Status
          </span>
          <span className="text-3xl font-mono text-emerald-400 font-semibold tracking-wider">
            Online
          </span>
        </div>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={item}>
            <div
              className={`card p-6 h-full flex flex-col justify-between group overflow-hidden ${i === 0 ? "bg-indigo-500/5 hover:bg-indigo-500/10" : ""}`}
            >
              <div className="flex items-start justify-between mb-8">
                <div
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800",
                    stat.color,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="relative z-10">
                <p className="label mb-2 group-hover:text-zinc-300 transition-colors">
                  {stat.label}
                </p>
                <p className="text-3xl lg:text-4xl font-semibold tracking-tight mb-2 transition-transform duration-300 group-hover:translate-x-1">
                  {stat.value}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-zinc-600 rounded-full"></div>
                  <p className="text-xs text-zinc-500 font-medium">
                    {stat.sub}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <motion.div variants={item} className="lg:col-span-2 space-y-8">
          <div className="card p-0 overflow-hidden h-72 flex flex-col border-zinc-800">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-rose-400 text-xs font-semibold tracking-widest uppercase rounded-full">
                <TrendingUp className="h-4 w-4" />
                Audience Growth
              </p>
            </div>
            <div className="flex-1 p-6 bg-zinc-950/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={engagementData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#52525b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
                    }}
                    itemStyle={{ color: "#e4e4e7", fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#fb7185"
                    opacity={0.9}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card border-zinc-800">
            <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-widest uppercase text-emerald-500">
                  Recommended for you
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Campaign Matches
                </h2>
              </div>
              <button className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                <ArrowUpRight className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between group gap-4 overflow-hidden"
                >
                  <div className="flex gap-4 items-center relative z-10">
                    <div className="h-14 w-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
                      <img
                        src={`https://images.unsplash.com/photo-${1500000000000 + i}?w=200&h=200&fit=crop`}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        alt="Campaign"
                      />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold block mb-1">
                        Tech & Gadgets
                      </span>
                      <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors">
                        Luxury Tech Campaign Alpha
                      </h3>
                    </div>
                  </div>
                  <div className="text-left sm:text-right relative z-10 pl-18 sm:pl-0">
                    <span className="text-xs uppercase tracking-widest text-emerald-500 font-semibold block mb-1">
                      Match Score
                    </span>
                    <p className="text-xl font-semibold tracking-tight text-white">
                      98.2%
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-center py-8 text-zinc-500 text-xs font-semibold uppercase tracking-widest border border-dashed border-zinc-800 rounded-2xl mt-2 bg-zinc-900/50">
                Scanning for additional matches...
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <div className="card h-full space-y-8 flex flex-col group hover:border-indigo-500/50 transition-colors border-zinc-800">
            <div className="flex-1">
              <p className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-xs font-semibold tracking-widest uppercase">
                About Me
              </p>
              <div className="pl-4 border-l-2 border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors">
                <p className="text-lg leading-relaxed text-zinc-300">
                  {profile?.bio || "Add a bio to tell brands about yourself..."}
                </p>
              </div>
            </div>
            <div className="space-y-4 pt-8 border-t border-zinc-800">
              <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Tags & Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {profile?.platforms?.map((p: string) => (
                  <span
                    key={p}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold tracking-wider text-zinc-300 hover:bg-zinc-800 transition-colors cursor-default"
                  >
                    {p}
                  </span>
                ))}
                {!profile?.platforms &&
                  ["Tech", "Lifestyle", "Fashion"].map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold tracking-wider text-zinc-500"
                    >
                      {t}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
