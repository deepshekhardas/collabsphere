import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Mon", views: 4000, engagement: 2400 },
  { name: "Tue", views: 3000, engagement: 1398 },
  { name: "Wed", views: 2000, engagement: 9800 },
  { name: "Thu", views: 2780, engagement: 3908 },
  { name: "Fri", views: 1890, engagement: 4800 },
  { name: "Sat", views: 2390, engagement: 3800 },
  { name: "Sun", views: 3490, engagement: 4300 },
];

export function Analytics() {
  return (
    <div className="space-y-12">
      <header className="border-b border-zinc-800 pb-8">
        <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2">
          Metrics Data
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
          Analytics
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          System-wide telemetry and interaction data over the past 7 days.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card group">
          <p className="text-sm font-medium text-zinc-400 mb-2">
            Total Impressions
          </p>
          <div className="text-3xl font-bold text-white">124.5K</div>
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            +14.2% from last week
          </div>
        </div>
        <div className="card group">
          <p className="text-sm font-medium text-zinc-400 mb-2">
            Engagement Rate
          </p>
          <div className="text-3xl font-bold text-white">4.8%</div>
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            +1.2% from last week
          </div>
        </div>
        <div className="card group">
          <p className="text-sm font-medium text-zinc-400 mb-2">
            Conversion Rate
          </p>
          <div className="text-3xl font-bold text-white">2.1%</div>
          <div className="mt-2 text-sm text-red-400 font-medium">
            -0.4% from last week
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white">
            Performance Overview
          </h2>
          <p className="text-sm text-zinc-400">
            Views vs Engagement correlation.
          </p>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorEngagement"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                tick={{ fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEngagement)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
