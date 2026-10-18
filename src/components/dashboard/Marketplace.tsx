import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Star,
  Info,
  X,
  Users,
  Network,
  TrendingUp,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MarketplaceProps {
  onNavigate?: (tab: string) => void;
}

export function Marketplace({ onNavigate }: MarketplaceProps) {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "creatorProfiles");
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        let finalData = [];
        if (fetched.length === 0) {
          finalData = [
            {
              id: "m1",
              displayName: "Sarah Content",
              bio: "UGC creator specializing in tech and lifestyle. 5+ years experience.",
              niche: ["Tech", "Lifestyle"],
              platforms: ["TikTok", "Instagram"],
              audienceSize: "120k",
              rating: 4.9,
              matchPercent: 98,
              image:
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop",
            },
            {
              id: "m2",
              displayName: "Alex Production",
              bio: "High-end video production and storytelling for premium brands.",
              niche: ["Production", "Storytelling"],
              platforms: ["YouTube"],
              audienceSize: "250k",
              rating: 5.0,
              matchPercent: 92,
              image:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop",
            },
            {
              id: "m3",
              displayName: "Creator Joy",
              bio: "Energetic and authentic reviews for beauty and fashion.",
              niche: ["Beauty", "Fashion"],
              platforms: ["TikTok"],
              audienceSize: "80k",
              rating: 4.7,
              matchPercent: 85,
              image:
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop",
            },
          ];
        } else {
          finalData = fetched.map((c) => ({
            ...c,
            matchPercent: Math.floor(Math.random() * 20) + 80,
          }));
        }
        setCreators(finalData);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleOffer = (creatorName: string) => {
    toast.success(`Collaboration offer initiated for ${creatorName}.`, {
      description:
        "Our protocol is analyzing the match for optimal engagement.",
    });
  };

  const filteredCreators = creators.filter(
    (c) =>
      (c.displayName || c.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (c.bio || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.niche || []).some((n: string) =>
        n.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <div className="flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <motion.div
        initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-white/[0.05] pb-8 relative z-20"
      >
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-[0.2em] uppercase">
            <Users className="h-3 w-3 animate-pulse" />
            Strategic Talent Acquisition / Section 02
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-2 drop-shadow-sm">
            Marketplace
            <br />
            <span className="text-zinc-500 font-medium">Distribution</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pb-2 z-30">
          <div className="relative group w-full sm:w-[350px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-indigo-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Protocols..."
              className="w-full pl-12 pr-4 h-12 bg-black/40 border border-white/5 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.02] transition-all relative z-40 shadow-inner"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="h-12 px-6 border border-white/10 bg-white/[0.02] rounded-xl text-sm font-semibold hover:bg-white/[0.05] hover:border-white/20 transition-all whitespace-nowrap shadow-sm hover:shadow active:scale-95"
          >
            Refine Matrix
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredCreators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.08,
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group"
          >
            <div className="card h-full flex flex-col p-6 hover:border-indigo-500/30 transition-colors relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>

              <div className="relative aspect-square mb-6 rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
                <img
                  src={
                    creator.image ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.displayName}`
                  }
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  alt={creator.displayName}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white mb-1 drop-shadow-md">
                      {creator.displayName}
                    </h3>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400 drop-shadow-sm">
                      Verified Protocol
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-lg">
                    <Star className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
                    <span className="text-sm font-semibold">
                      {creator.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6 relative z-10">
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                  {creator.bio}
                </p>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.05]">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block mb-1">
                      Audience
                    </span>
                    <span className="text-lg font-bold tracking-tight text-white">
                      {creator.audienceSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 block mb-1">
                      Niche
                    </span>
                    <span className="text-lg font-bold tracking-tight capitalize text-white">
                      {creator.niche?.[0] || "UGC"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 relative z-10">
                <button
                  onClick={() => handleOffer(creator.displayName)}
                  className="btn-primary flex-1"
                >
                  Initiate Offer
                </button>
                <button
                  onClick={() => setSelectedCreator(creator)}
                  className="h-full px-4 flex-shrink-0 border border-white/[0.08] bg-white/[0.02] rounded-xl flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.15] transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="h-5 w-5 text-zinc-400 group-hover:text-zinc-200" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Sidebar overlay */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#060608] border-l border-white/[0.05] z-[101] p-10 md:p-16 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/[0.05]">
                <p className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full">
                  <Filter className="h-3 w-3" />
                  Filter Matrix
                </p>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">
                    Classification
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["UGC-A", "PROTOCOL-X", "AUTH-NODE", "VIRAL-S"].map(
                      (f) => (
                        <button
                          key={f}
                          className="border border-white/5 bg-white/[0.02] rounded-xl py-3 text-[11px] font-bold text-zinc-400 hover:border-white/20 hover:text-white hover:bg-white-[0.05] transition-colors uppercase tracking-[0.2em] shadow-sm"
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">
                    Neural Threshold
                  </label>
                  <div className="card p-5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.1em] mb-4">
                      <span className="text-zinc-500">Aggregate Reach</span>
                      <span className="text-indigo-400">50K - 1M+</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 border border-white/5 rounded-full relative">
                      <div className="absolute top-0 left-0 w-2/3 h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                      <div className="absolute top-1/2 left-2/3 h-4 w-4 bg-white rounded-full border-2 border-indigo-500 -translate-y-1/2 -translate-x-1/2 cursor-pointer shadow-lg hover:scale-110 transition-transform"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full btn-primary"
                >
                  Apply Matrix
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Detail Dialog */}
      <AnimatePresence>
        {selectedCreator && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCreator(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-zinc-950 border border-zinc-800 z-[101] p-8 sm:p-12 space-y-8 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="h-32 w-32 sm:h-48 sm:w-48 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shrink-0 group shadow-inner">
                    <img
                      src={
                        selectedCreator.image ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedCreator.displayName}`
                      }
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      alt={selectedCreator.displayName}
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                    <p className="label text-indigo-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Detailed Talent Dossier
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-2">
                      {selectedCreator.displayName}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedCreator.platforms?.map((p: string) => (
                        <span
                          key={p}
                          className="px-3 py-1 bg-zinc-800 border border-zinc-700/50 rounded-md text-xs font-semibold text-zinc-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCreator(null)}
                  className="text-zinc-500 hover:text-white transition-colors bg-zinc-900/50 rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8 border-y border-zinc-800 py-8 relative z-10">
                <div className="col-span-1 md:col-span-3 space-y-4">
                  <span className="label">Talent Narrative</span>
                  <div className="pl-4 border-l-2 border-zinc-800">
                    <p className="text-lg leading-relaxed text-zinc-300">
                      "{selectedCreator.bio}"
                    </p>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="card p-6 h-full space-y-6">
                    <span className="label">Neural Metrics</span>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <p className="text-sm font-medium text-zinc-400">
                          Aggregate Reach
                        </p>
                        <p className="text-xl font-semibold text-white">
                          {selectedCreator.audienceSize}
                        </p>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <p className="text-sm font-medium text-zinc-400">
                          Strategic Match
                        </p>
                        <p className="text-xl font-bold text-indigo-400">
                          {selectedCreator.matchPercent}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2 relative z-10">
                <Button
                  onClick={() => {
                    handleOffer(selectedCreator.displayName);
                    setSelectedCreator(null);
                  }}
                  className="btn-primary flex-1"
                >
                  Initiate Direct Engagement
                </Button>
                <Button
                  onClick={() => setSelectedCreator(null)}
                  variant="outline"
                  className="px-8"
                >
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
