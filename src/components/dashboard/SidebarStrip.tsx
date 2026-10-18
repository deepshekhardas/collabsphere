import React, { useState } from "react";
import { LucideIcon, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { motion } from "motion/react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarStripProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
  userName?: string;
}

export function SidebarStrip({
  items,
  activeId,
  onChange,
  userName,
}: SidebarStripProps) {
  const [isOpen, setIsOpen] = useState(false);
  const handleLogout = () => auth.signOut();

  const handleNavClick = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800/80 bg-[#0a0a0a]/80 backdrop-blur-xl relative z-40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="h-3 w-3 bg-[#0a0a0a] rotate-45 rounded-sm"></div>
          </div>
          <span className="font-bold tracking-tight text-white drop-shadow-sm">
            Collab<span className="text-rose-500">Sphere</span>
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-zinc-400 hover:text-white p-2"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={cn(
          "w-64 border-r border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0 absolute md:relative z-50 h-[calc(100vh-73px)] md:h-full py-6 px-4 transition-transform duration-300 md:translate-x-0 md:shadow-none",
          isOpen
            ? "translate-x-0 top-[73px] left-0 shadow-2xl"
            : "-translate-x-full md:left-auto md:top-auto",
        )}
      >
        <div className="hidden md:flex items-center gap-3 px-4 mb-8">
          <div className="h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="h-3 w-3 bg-[#0a0a0a] rotate-45 rounded-sm"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            Collab<span className="text-rose-500">Sphere</span>
          </span>
        </div>

        <nav className="flex-1 w-full flex flex-col gap-1">
          <div className="px-4 mb-3 mt-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Dashboard
            </span>
          </div>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium",
                  isActive
                    ? "text-rose-400 bg-[#111111]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-[#111111]/50",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-rose-500 rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300",
                    isActive
                      ? "text-rose-400"
                      : "text-zinc-500 group-hover:scale-110",
                    isActive && "scale-110",
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-white truncate max-w-[120px]">
                {userName || "User"}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>{" "}
                Online
              </span>
            </div>
            <button
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg group"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
