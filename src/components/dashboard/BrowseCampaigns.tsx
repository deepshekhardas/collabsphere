import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, DollarSign, Rocket, ExternalLink, Send } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

const CampaignSkeleton = () => (
  <div className="card flex flex-col p-0 border border-zinc-800 bg-zinc-900/20 overflow-hidden animate-pulse">
    <div className="h-48 bg-zinc-800/50 rounded-t-xl w-full"></div>
    <div className="flex-1 space-y-6 p-6">
      <div className="space-y-3">
        <div className="h-6 bg-zinc-800/50 rounded w-3/4"></div>
        <div className="h-4 bg-zinc-800/50 rounded w-full"></div>
        <div className="h-4 bg-zinc-800/50 rounded w-5/6"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800/50 rounded w-16"></div>
          <div className="h-6 bg-zinc-800/50 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800/50 rounded w-16"></div>
          <div className="h-6 bg-zinc-800/50 rounded w-20"></div>
        </div>
      </div>
      <div className="h-12 bg-zinc-800/50 rounded-xl w-full mt-4"></div>
    </div>
  </div>
);

export function BrowseCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const CAMPAIGNS_PER_PAGE = 6;

  useEffect(() => {
    fetchCampaigns(true);
  }, []);

  const fetchCampaigns = async (isInitial = false) => {
    if (!isInitial && (!hasMore || loadingMore)) return;

    if (isInitial) {
      setLoading(true);
      setCampaigns([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const path = "campaigns";
      let q = query(
        collection(db, path),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(CAMPAIGNS_PER_PAGE),
      );

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snap = await getDocs(q);
      const newCampaigns = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === CAMPAIGNS_PER_PAGE);
      setCampaigns((prev) =>
        isInitial ? newCampaigns : [...prev, ...newCampaigns],
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "campaigns");
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmission = async () => {
    if (!auth.currentUser || !selectedCampaign) return;
    setSubmitting(true);
    const path = "submissions";
    try {
      await addDoc(collection(db, path), {
        campaignId: selectedCampaign.id,
        creatorId: auth.currentUser.uid,
        businessId: selectedCampaign.businessId,
        contentUrl: submissionUrl,
        contentType: "link",
        status: "pending",
        payoutAmount: selectedCampaign.payoutPerCreator,
        createdAt: serverTimestamp(),
      });
      toast.success("Content submitted for review!");
      setSelectedCampaign(null);
      setSubmissionUrl("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-12 pb-16">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8">
        <div className="space-y-4">
          <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2 flex items-center gap-2">
            <Rocket className="h-3 w-3" />
            Active Campaigns
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Browse Campaigns
          </h1>
        </div>
        <div className="w-full sm:w-[350px] pb-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-indigo-400 pointer-events-none" />
            <input
              placeholder="Search Campaigns..."
              className="w-full pl-12 pr-4 h-12 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
          </>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              No Active Campaigns
            </p>
          </div>
        ) : (
          campaigns.map((c, i) => (
            <div
              key={c.id}
              className="card flex flex-col p-0 hover:border-indigo-500/50 transition-colors"
            >
              <div className="h-48 border-b border-zinc-800 relative overflow-hidden bg-zinc-900 rounded-t-xl">
                <img
                  src={`https://images.unsplash.com/photo-${1510000000000 + i}?auto=format&fit=crop&q=80&w=800`}
                  className="w-full h-full object-cover"
                  alt={c.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <span className="px-2.5 py-1 bg-black/60 rounded-md border border-white/10 text-xs font-semibold text-zinc-300">
                    {c.platform?.join(" / ") || "Multichannel"}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-6 p-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white line-clamp-1">
                    {c.title}
                  </h2>
                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 block mb-1 uppercase tracking-wider">
                      Payout
                    </span>
                    <span className="text-xl font-bold text-emerald-400">
                      ${c.payoutPerCreator}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 block mb-1 uppercase tracking-wider">
                      Status
                    </span>
                    <span className="text-xl font-bold text-white capitalize">
                      {c.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCampaign(c)}
                  className="btn-primary w-full mt-4"
                >
                  Submit Content
                </button>
                <Dialog
                  open={selectedCampaign?.id === c.id}
                  onOpenChange={(open) => setSelectedCampaign(open ? c : null)}
                >
                  <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-800 p-8">
                    <DialogHeader className="mb-6">
                      <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">
                        CAMPAIGN_ID: {c.id.slice(0, 8)}
                      </p>
                      <DialogTitle className="text-2xl font-semibold text-white">
                        Submit Content for Review
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2 relative">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Content Hyperlink
                        </label>
                        <input
                          className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                          value={submissionUrl}
                          onChange={(e) => setSubmissionUrl(e.target.value)}
                          placeholder="https://tiktok.com/@yourusername/video/..."
                          autoFocus
                        />
                      </div>
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <p className="text-xs font-semibold text-zinc-500 leading-relaxed uppercase tracking-wider">
                          Content will be reviewed by the brand. Payout will be
                          processed upon successful verification.
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="mt-4 border-t border-zinc-800 pt-6">
                      <Button
                        onClick={handleSubmission}
                        disabled={submitting || !submissionUrl}
                        className="btn-primary w-full sm:w-auto h-12"
                      >
                        {submitting ? "Submitting..." : "Submit Content"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={() => fetchCampaigns(false)}
            disabled={loadingMore}
            className="px-8 py-3 rounded-full bg-zinc-900 border border-zinc-800 text-white font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More Campaigns"}
          </button>
        </div>
      )}
    </div>
  );
}
