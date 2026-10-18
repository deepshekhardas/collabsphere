import React, { useState } from "react";
import { initialDashboardTab, rememberDashboardTab } from "@/lib/dashboard-navigation";
import { User } from "firebase/auth";
import { SidebarStrip } from "./SidebarStrip";
import { CreatorOverview } from "./CreatorOverview";
import { BrowseCampaigns } from "./BrowseCampaigns";
import { CreatorActiveCampaigns } from "./CreatorActiveCampaigns";
import { MyEarningList } from "./MyEarningList";
import { Analytics } from "./Analytics";
import { Chat } from "./Chat";
import { Contracts } from "./Contracts";
import { Support } from "./Support";
import { SettingsView } from "./SettingsView";
import { NotificationsPanel } from "./NotificationsPanel";
import { Portfolio } from "./Portfolio";
import {
  LayoutDashboard,
  Search,
  Wallet as WalletIcon,
  User as UserIcon,
  Settings,
  Activity,
  ShieldCheck,
  MessageSquare,
  LineChart,
  Bell,
  FileText,
  LifeBuoy,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useNotifications } from "@/lib/useNotifications";

interface CreatorDashboardProps {
  user: User;
  profile: any;
}

export function CreatorDashboard({ user, profile }: CreatorDashboardProps) {
  const [activeTab, setActiveTab] = useState(
    () => initialDashboardTab("creatorActiveTab", ["overview", "browse", "active", "chat", "analytics", "contracts", "earnings", "profile", "support", "settings"]),
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount, notifications, markAllAsRead } = useNotifications();

  React.useEffect(() => {
    rememberDashboardTab("creatorActiveTab", activeTab);
  }, [activeTab]);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "browse", label: "Find Campaigns", icon: Search },
    { id: "active", label: "My Missions", icon: Target },
    { id: "chat", label: "Messages", icon: MessageSquare },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "contracts", label: "Contracts", icon: FileText },
    { id: "earnings", label: "Earnings", icon: WalletIcon },
    { id: "profile", label: "My Profile", icon: UserIcon },
    { id: "support", label: "Support", icon: LifeBuoy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col md:flex-row text-zinc-100 font-sans overflow-hidden bg-black selection:bg-indigo-500/30 selection:text-indigo-200">
      <SidebarStrip
        items={navItems}
        activeId={activeTab}
        onChange={setActiveTab}
        userName={profile?.displayName || user.displayName}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-black">
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen opacity-30 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>

        <header className="h-20 border-b border-white/[0.05] flex items-center justify-between px-6 lg:px-10 shrink-0 bg-black/80 backdrop-blur-xl z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
              Dashboard Online
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-[11px] font-mono text-zinc-500 hidden sm:block tracking-widest">
              {new Date().toLocaleTimeString()} UTC
            </div>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2.5 text-zinc-400 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-105 active:scale-95"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        <NotificationsPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          markAllAsRead={markAllAsRead}
        />

        <main className="flex-1 overflow-y-auto relative p-6 md:p-8 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full max-w-7xl mx-auto"
            >
              {activeTab === "overview" && (
                <CreatorOverview profile={profile} />
              )}
              {activeTab === "browse" && <BrowseCampaigns />}
              {activeTab === "active" && <CreatorActiveCampaigns />}
              {activeTab === "chat" && <Chat user={user} profile={profile} />}
              {activeTab === "analytics" && <Analytics />}
              {activeTab === "contracts" && <Contracts />}
              {activeTab === "earnings" && <MyEarningList userId={user.uid} />}
              {activeTab === "profile" && (
                <div className="space-y-12">
                  <header className="border-b border-zinc-800 pb-8">
                    <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verified Creator
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                      Identity & Portfolio
                    </h1>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 card">
                      <div className="aspect-square bg-zinc-800 rounded-xl mb-8 relative overflow-hidden group border border-zinc-700/50">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.displayName || user.email}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          alt="Avatar"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1 block">
                            Alias
                          </span>
                          <span className="text-xl font-semibold text-white">
                            {profile?.displayName || "Anonymous"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase block mb-2">
                            Category
                          </span>
                          <span className="text-lg font-semibold text-emerald-400">
                            {profile?.niche?.join(" & ") || "Generalist"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase block mb-2">
                            Total Followers
                          </span>
                          <span className="text-xl font-semibold text-white">
                            84.2K
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                      <div className="card h-full border-zinc-800">
                        <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase block mb-6">
                          About Me
                        </span>
                        <p className="text-lg leading-relaxed text-zinc-300">
                          {profile?.bio ||
                            "Add a bio to tell brands about yourself..."}
                        </p>

                        <div className="mt-12 pt-8 border-t border-zinc-800 grid grid-cols-2 gap-8">
                          <div>
                            <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase block mb-4">
                              Platforms
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {profile?.platforms?.map((p: string) => (
                                <span
                                  key={p}
                                  className="px-3 py-1 bg-zinc-900 rounded-md text-xs font-semibold text-zinc-300 border border-zinc-800"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase block mb-4">
                              Engagement Rate
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-4xl font-semibold tracking-tight text-white">
                                92.4
                                <span className="text-lg text-zinc-500 ml-1">
                                  %
                                </span>
                              </span>
                              <Activity className="h-6 w-6 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-zinc-800 pt-8">
                    <Portfolio />
                  </div>
                </div>
              )}
              {activeTab === "support" && <Support user={user} />}
              {activeTab === "settings" && (
                <SettingsView
                  profileType="creator"
                  user={user}
                  profile={profile}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
