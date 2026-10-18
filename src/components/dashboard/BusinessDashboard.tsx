import React, { useState } from "react";
import { initialDashboardTab, rememberDashboardTab } from "@/lib/dashboard-navigation";
import { User } from "firebase/auth";
import { SidebarStrip } from "./SidebarStrip";
import { BusinessOverview } from "./BusinessOverview";
import { Marketplace } from "./Marketplace";
import { Scripting } from "./Scripting";
import { Campaigns } from "./Campaigns";
import { SubmissionsReview } from "./SubmissionsReview";
import { CompetitorTracker } from "./CompetitorTracker";
import { Wallet } from "./Wallet";
import { Analytics } from "./Analytics";
import { Chat } from "./Chat";
import { Contracts } from "./Contracts";
import { Support } from "./Support";
import { SettingsView } from "./SettingsView";
import { NotificationsPanel } from "./NotificationsPanel";
import {
  LayoutDashboard,
  Users,
  PenTool,
  Rocket,
  Wallet as WalletIcon,
  Settings,
  MessageSquare,
  LineChart,
  Bell,
  FileText,
  LifeBuoy,
  CheckSquare,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useNotifications } from "@/lib/useNotifications";

interface BusinessDashboardProps {
  user: User;
  profile: any;
}

export function BusinessDashboard({ user, profile }: BusinessDashboardProps) {
  const [activeTab, setActiveTab] = useState(
    () => initialDashboardTab("businessActiveTab", ["overview", "marketplace", "intelligence", "chat", "submissions", "analytics", "contracts", "scripting", "campaigns", "wallet", "support", "settings"]),
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("appTheme") || "modern",
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount, notifications, markAllAsRead } = useNotifications();

  React.useEffect(() => {
    rememberDashboardTab("businessActiveTab", activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "marketplace", label: "Marketplace", icon: Users },
    { id: "intelligence", label: "Intelligence", icon: Crosshair },
    { id: "chat", label: "Messages", icon: MessageSquare },
    { id: "submissions", label: "Review Submissions", icon: CheckSquare },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "contracts", label: "Contracts", icon: FileText },
    { id: "scripting", label: "AI Scripting", icon: PenTool },
    { id: "campaigns", label: "Campaigns", icon: Rocket },
    { id: "wallet", label: "Wallet", icon: WalletIcon },
    { id: "support", label: "Support", icon: LifeBuoy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col md:flex-row text-zinc-100 font-sans overflow-hidden bg-black selection:bg-indigo-500/30 selection:text-indigo-200">
      <SidebarStrip
        items={navItems}
        activeId={activeTab}
        onChange={setActiveTab}
        userName={profile?.name || user.displayName}
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
                <BusinessOverview profile={profile} onNavigate={setActiveTab} />
              )}
              {activeTab === "marketplace" && (
                <Marketplace onNavigate={setActiveTab} />
              )}
              {activeTab === "intelligence" && <CompetitorTracker />}
              {activeTab === "chat" && <Chat user={user} profile={profile} />}
              {activeTab === "submissions" && (
                <SubmissionsReview businessId={user.uid} />
              )}
              {activeTab === "analytics" && <Analytics />}
              {activeTab === "contracts" && <Contracts />}
              {activeTab === "scripting" && <Scripting profile={profile} />}
              {activeTab === "campaigns" && <Campaigns />}
              {activeTab === "wallet" && <Wallet userId={user.uid} />}
              {activeTab === "support" && <Support user={user} />}
              {activeTab === "settings" && (
                <SettingsView
                  profileType="business"
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
