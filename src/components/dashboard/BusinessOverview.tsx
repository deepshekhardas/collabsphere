import React from "react";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Share2,
  Layers,
  Copy,
} from "lucide-react";
import { motion } from "motion/react";
import { SubmissionsReview } from "./SubmissionsReview";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import Markdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const chartData = [
  { name: "Jan", value: 120 },
  { name: "Feb", value: 210 },
  { name: "Mar", value: 180 },
  { name: "Apr", value: 310 },
  { name: "May", value: 290 },
  { name: "Jun", value: 450 },
  { name: "Jul", value: 400 },
];

interface BusinessOverviewProps {
  profile: any;
  onNavigate: (tab: string) => void;
}

export function BusinessOverview({
  profile,
  onNavigate,
}: BusinessOverviewProps) {
  const stats = [
    {
      label: "Budget/Mo",
      value: profile?.monthlyBudget || "$0.00",
      icon: DollarSign,
      color: "text-indigo-400",
    },
    {
      label: "Industry",
      value: profile?.industry || "N/A",
      icon: Target,
      color: "text-white/40",
    },
    {
      label: "Active Campaigns",
      value: "03 ACTIVE",
      icon: Activity,
      color: "text-emerald-400",
    },
    {
      label: "Content Scripts",
      value: "12 SAVED",
      icon: Layers,
      color: "text-white/40",
    },
  ];

  const [strategyOpen, setStrategyOpen] = React.useState(false);
  const strategyContent = `BRAND STRATEGY: ${profile?.name}\n\n${profile?.brandSummary || "No strategy defined."}\n\nTARGET: ${profile?.targetAudience}\nOFFER: ${profile?.offer}\nCHANNELS: ${profile?.platforms?.join(", ")}`;

  const handleExportStrategy = () => {
    try {
      // Attempt standard download first (works on regular popouts)
      const blob = new Blob([strategyContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile?.name?.replace(/\s+/g, "_") || "brand"}_strategy.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Strategy protocol export initiated.");
    } catch (e) {
      console.error(e);
    }
    // Always open the dialog as a fallback for iframe sandbox
    setStrategyOpen(true);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Hero Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col lg:flex-row gap-12"
      >
        <div className="lg:w-7/12 flex flex-col justify-center">
          <motion.div variants={item}>
            <p className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              {profile?.industry?.toUpperCase() || "GENERAL"}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-sm">
              {profile?.name || "Business"}
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
              Brand management dashboard. Modify details, create campaigns, and
              view active performance.
            </p>
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap gap-4 mt-8">
            <button
              onClick={() => onNavigate("campaigns")}
              className="btn-primary"
            >
              Create Campaign
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="px-6 py-3 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/5 hover:border-white/20 transition-all focus:ring-2 focus:ring-white/20 outline-none"
            >
              Edit Profile
            </button>
          </motion.div>
        </div>

        <motion.div variants={item} className="lg:w-5/12">
          <div className="grid grid-cols-2 gap-4 h-full">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`card p-6 flex flex-col justify-between group overflow-hidden ${i === 0 ? "bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/10" : ""}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="label group-hover:text-zinc-300 transition-colors truncate">
                    {stat.label}
                  </span>
                  <stat.icon
                    className={cn(
                      "w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity",
                      stat.color,
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-2xl lg:text-3xl font-bold tracking-tight transition-transform duration-300 group-hover:translate-x-1 truncate shadow-sm",
                    stat.color,
                  )}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 space-y-8 lg:space-y-12">
          <section className="card p-0 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Brand Strategy
                </h3>
                <p className="text-zinc-400 text-sm">
                  Target audience and market placement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-300">
                  Last 7 Months
                </span>
              </div>
            </div>
            <div className="h-72 w-full p-4 lg:p-6 bg-gradient-to-b from-transparent to-black/20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#52525b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
                    }}
                    itemStyle={{ color: "#e4e4e7", fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#818cf8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SubmissionsReview businessId={profile.id} />
          </section>

          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
              <p className="label flex items-center gap-2 text-indigo-400">
                <Share2 className="h-4 w-4" />
                Brand Guidelines
              </p>
              <Dialog open={strategyOpen} onOpenChange={setStrategyOpen}>
                <DialogTrigger
                  onClick={() => {
                    try {
                      const blob = new Blob([strategyContent], {
                        type: "text/markdown",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${profile?.name?.replace(/\s+/g, "_") || "brand"}_strategy.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success("Strategy protocol export initiated.");
                    } catch (e) {}
                  }}
                  className="text-xs uppercase font-semibold tracking-wider text-zinc-500 hover:text-white transition-colors"
                >
                  Export Strategy
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 p-8">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-semibold tracking-tight text-white mb-2">
                      Strategy Protocol Export
                    </DialogTitle>
                    <p className="text-sm text-zinc-400">
                      If your browser blocked the download, you can manually
                      copy the protocol below.
                    </p>
                  </DialogHeader>
                  <div className="relative mt-2">
                    <textarea
                      readOnly
                      value={strategyContent}
                      className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setStrategyOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(strategyContent);
                        toast.success("Protocol copied to clipboard.");
                      }}
                      className="btn-primary py-2 text-sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="card group">
              <div className="text-lg leading-relaxed text-zinc-300 whitespace-pre-wrap markdown-body">
                {profile?.brandSummary ? (
                  <Markdown>{profile.brandSummary}</Markdown>
                ) : (
                  "No specific strategy defined yet."
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center">
                <p className="text-xs font-mono text-zinc-500 uppercase">
                  Confidence Index:{" "}
                  <span className="text-emerald-500 ml-2">94.2%</span>
                </p>
                <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-indigo-500"></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:w-80 space-y-8 shrink-0">
          <section className="space-y-6 card">
            <p className="label border-b border-zinc-800 pb-4 mb-4">
              Targeting
            </p>
            <div className="space-y-6">
              <div className="group">
                <span className="label block mb-2 group-hover:text-zinc-300 transition-colors">
                  Target Audience
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {profile?.targetAudience}
                </p>
              </div>
              <div className="group">
                <span className="label block mb-2 group-hover:text-zinc-300 transition-colors">
                  Main Offer
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {profile?.offer}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6 card">
            <p className="label border-b border-zinc-800 pb-4 mb-4">
              Target Platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {profile?.platforms?.map((p: string) => (
                <div
                  key={p}
                  className="px-3 py-1.5 bg-zinc-800/50 rounded-md border border-zinc-700/50 text-xs font-medium text-zinc-300"
                >
                  {p}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
