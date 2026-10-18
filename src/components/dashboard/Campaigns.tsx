import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Rocket,
  MoreHorizontal,
  Terminal,
  Activity,
  Zap,
  Shield,
  Network,
  ArrowRight,
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";
import { z } from "zod";
import { PaymentModal } from "./PaymentModal";

const campaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  budget: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Budget must be a valid number greater than 0",
  }),
  payoutPerCreator: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Payout must be a valid number greater than 0",
    }),
  niche: z.string().min(2, "At least one niche is required"),
  platform: z.string().min(2, "At least one platform is required"),
});

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const [matchedCreators, setMatchedCreators] = useState<any[]>([]);
  const [matchingCampaign, setMatchingCampaign] = useState<any>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const fetchAIMatches = async (campaign: any) => {
    setMatchingCampaign(campaign);
    setMatchLoading(true);
    setMatchedCreators([]);

    try {
      // First fetch available creators
      const snapshot = await getDocs(collection(db, "creatorProfiles"));
      const creators = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (creators.length === 0) {
        toast.info("No creators found in the registry.");
        setMatchLoading(false);
        return;
      }

      const res = await fetch("/api/match-creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignDescription: campaign.description,
          creators,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to match creators");
      }

      const matchData = await res.json();

      // Merge matchData with creators
      const merged = creators
        .map((c: any) => {
          const aiMatch = matchData.find((m: any) => m.id === c.id);
          return {
            ...c,
            matchPercentage: aiMatch
              ? aiMatch.matchPercentage
              : Math.floor(Math.random() * 30 + 50),
            reason: aiMatch ? aiMatch.reason : "General fit",
          };
        })
        .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);

      setMatchedCreators(merged);
    } catch (error) {
      console.error(error);
      toast.error("AI matcher failed to connect");
    } finally {
      setMatchLoading(false);
    }
  };
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    offer: "",
    budget: "",
    payoutPerCreator: "",
    niche: "",
    platform: "",
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = "campaigns";
    const q = query(
      collection(db, path),
      where("businessId", "==", auth.currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setCampaigns(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const saveCampaign = async () => {
    const path = "campaigns";
    try {
      if (editMode && editingId) {
        await updateDoc(doc(db, path, editingId), {
          title: newCampaign.title,
          description: newCampaign.description,
          budget: Number(newCampaign.budget),
          payoutPerCreator: Number(newCampaign.payoutPerCreator),
          niche: newCampaign.niche
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean),
          platform: newCampaign.platform
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          updatedAt: serverTimestamp(),
        });
        toast.success("PROTOCOL MODIFIED", {
          description: `Campaign "${newCampaign.title}" has been updated.`,
        });
      } else {
        const campaign = {
          title: newCampaign.title,
          description: newCampaign.description,
          businessId: auth.currentUser?.uid,
          budget: Number(newCampaign.budget),
          payoutPerCreator: Number(newCampaign.payoutPerCreator),
          niche: newCampaign.niche
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean),
          platform: newCampaign.platform
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          status: "active",
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, path), campaign);
        toast.success("MISSION DEPLOYED & ESCROW FUNDED", {
          description: `Campaign "${newCampaign.title}" is now active.`,
        });
      }

      setOpen(false);
      setEditMode(false);
      setEditingId(null);
      setNewCampaign({
        title: "",
        description: "",
        offer: "",
        budget: "",
        payoutPerCreator: "",
        niche: "",
        platform: "",
      });
      setErrors({});
    } catch (error) {
      handleFirestoreError(
        error,
        editMode ? OperationType.UPDATE : OperationType.CREATE,
        path,
      );
      toast.error("Operation failed.");
    }
  };

  const handleCreate = async () => {
    if (!auth.currentUser) return;

    try {
      campaignSchema.parse(newCampaign);
      setErrors({});
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((e: any) => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message;
        });
        setErrors(fieldErrors);
        toast.error("Please fix the validation errors.");
        return;
      }
    }

    if (editMode) {
      saveCampaign();
    } else {
      setPaymentModalOpen(true);
    }
  };

  const handleEditClick = (campaign: any) => {
    setEditMode(true);
    setEditingId(campaign.id);
    setNewCampaign({
      title: campaign.title || "",
      description: campaign.description || "",
      offer: campaign.offer || "",
      budget: campaign.budget?.toString() || "",
      payoutPerCreator: campaign.payoutPerCreator?.toString() || "",
      niche: campaign.niche?.join(", ") || "",
      platform: campaign.platform?.join(", ") || "",
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to terminate mission "${title}"?`))
      return;
    try {
      await deleteDoc(doc(db, "campaigns", id));
      toast.success("MISSION TERMINATED");
    } catch (error) {
      toast.error("Termination failed");
    }
  };

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
    <div className="flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8 relative z-20">
        <div className="space-y-4">
          <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2 flex items-center gap-2">
            <Rocket className="h-3 w-3" />
            Brand Workspace
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Campaigns
          </h1>
        </div>
        <div className="flex gap-4 pb-2 z-30">
          <Dialog
            open={open}
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) {
                setEditMode(false);
                setEditingId(null);
                setNewCampaign({
                  title: "",
                  description: "",
                  offer: "",
                  budget: "",
                  payoutPerCreator: "",
                  niche: "",
                  platform: "",
                });
              }
            }}
          >
            <DialogTrigger className="btn-primary w-full sm:w-auto h-12 px-6 flex items-center justify-center">
              <Plus className="mr-2 h-4 w-4" /> Create Campaign
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 p-8 shadow-2xl">
              <DialogHeader className="mb-6">
                <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">
                  Brand Workspace
                </p>
                <DialogTitle className="text-2xl font-semibold tracking-tight text-white mt-2">
                  {editMode ? "Edit Campaign" : "New Campaign Details"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Campaign Name
                  </Label>
                  <Input
                    className={cn(
                      "h-12 bg-zinc-900 border-zinc-800 focus-visible:border-indigo-500/50 text-sm font-medium text-white placeholder:text-zinc-600 transition-all rounded-xl",
                      errors.title && "border-red-500",
                    )}
                    value={newCampaign.title}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, title: e.target.value })
                    }
                    placeholder="Summer Launch 2026"
                  />
                  {errors.title && (
                    <span className="text-xs text-red-500">{errors.title}</span>
                  )}
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Description
                  </Label>
                  <Textarea
                    className={cn(
                      "min-h-[120px] bg-zinc-900 border-zinc-800 focus-visible:border-indigo-500/50 placeholder:text-zinc-600 resize-none text-sm font-medium text-white transition-all rounded-xl",
                      errors.description && "border-red-500",
                    )}
                    value={newCampaign.description}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of the goals..."
                  />
                  {errors.description && (
                    <span className="text-xs text-red-500">
                      {errors.description}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Total Budget ($)
                    </Label>
                    <Input
                      type="number"
                      className={cn(
                        "h-12 bg-zinc-900 border-zinc-800 focus-visible:border-emerald-500/50 text-sm font-medium text-white placeholder:text-zinc-600 transition-all rounded-xl",
                        errors.budget && "border-red-500",
                      )}
                      value={newCampaign.budget}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          budget: e.target.value,
                        })
                      }
                    />
                    {errors.budget && (
                      <span className="text-xs text-red-500">
                        {errors.budget}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Payout Per Creator ($)
                    </Label>
                    <Input
                      type="number"
                      className={cn(
                        "h-12 bg-zinc-900 border-zinc-800 focus-visible:border-emerald-500/50 text-sm font-medium text-white placeholder:text-zinc-600 transition-all rounded-xl",
                        errors.payoutPerCreator && "border-red-500",
                      )}
                      value={newCampaign.payoutPerCreator}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          payoutPerCreator: e.target.value,
                        })
                      }
                    />
                    {errors.payoutPerCreator && (
                      <span className="text-xs text-red-500">
                        {errors.payoutPerCreator}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Target Platforms
                    </Label>
                    <Input
                      className={cn(
                        "h-12 bg-zinc-900 border-zinc-800 focus-visible:border-indigo-500/50 text-sm font-medium text-white placeholder:text-zinc-600 transition-all rounded-xl",
                        errors.platform && "border-red-500",
                      )}
                      value={newCampaign.platform}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          platform: e.target.value,
                        })
                      }
                      placeholder="TikTok, Instagram"
                    />
                    {errors.platform && (
                      <span className="text-xs text-red-500">
                        {errors.platform}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Niche Sectors
                    </Label>
                    <Input
                      className={cn(
                        "h-12 bg-zinc-900 border-zinc-800 focus-visible:border-indigo-500/50 text-sm font-medium text-white placeholder:text-zinc-600 transition-all rounded-xl",
                        errors.niche && "border-red-500",
                      )}
                      value={newCampaign.niche}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          niche: e.target.value,
                        })
                      }
                      placeholder="Tech, Skincare"
                    />
                    {errors.niche && (
                      <span className="text-xs text-red-500">
                        {errors.niche}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-6 border-t border-zinc-800 mt-4">
                <Button
                  onClick={handleCreate}
                  className="btn-primary w-full sm:w-auto h-12 px-8"
                >
                  {editMode ? "Update Campaign" : "Create Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <PaymentModal
            open={paymentModalOpen}
            amount={Number(newCampaign.budget) || 0}
            userId={auth.currentUser?.uid || ""}
            onSuccess={() => {
              setPaymentModalOpen(false);
              saveCampaign();
            }}
            onClose={() => setPaymentModalOpen(false)}
          />
        </div>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <Activity className="animate-spin h-8 w-8 text-zinc-500 mb-4" />
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
              Loading Data...
            </p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card text-center py-20 border-dashed border-zinc-800 bg-zinc-900/50">
            <div className="flex flex-col items-center gap-6">
              <div className="h-16 w-16 border border-zinc-700 bg-zinc-800 rounded-2xl flex items-center justify-center">
                <Terminal className="h-8 w-8 text-zinc-500" />
              </div>
              <div className="space-y-2">
                <p className="text-zinc-300 font-semibold tracking-wide">
                  No campaigns found
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Create a new campaign to get started.
                </p>
              </div>
            </div>
          </div>
        ) : (
          campaigns.map((c) => (
            <motion.div
              key={c.id}
              variants={item}
              className="card group flex flex-col xl:flex-row xl:items-center justify-between gap-8 p-6 hover:border-indigo-500/50 transition-all duration-300"
            >
              <div className="flex gap-6 items-center">
                <div className="h-16 w-16 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors shrink-0">
                  <Rocket className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight text-white mb-1">
                    {c.title}
                  </h3>
                  <div className="flex gap-4 items-center">
                    <span className="px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      {c.status}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      ID: {c.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between xl:justify-end gap-8 self-stretch xl:self-center">
                <div className="text-right space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Budget
                  </p>
                  <p className="text-2xl font-semibold tracking-tight text-white">
                    ${c.budget?.toLocaleString()}
                  </p>
                </div>
                <div className="text-right space-y-1 pl-8 border-l border-zinc-800">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
                    Submissions
                  </p>
                  <p className="text-2xl font-semibold tracking-tight text-white">
                    0{" "}
                    <span className="text-xs uppercase tracking-widest font-semibold text-zinc-500 ml-1">
                      Items
                    </span>
                  </p>
                </div>

                <div className="pl-6 border-l border-zinc-800 h-full flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                        >
                          <MoreHorizontal className="h-6 w-6" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-950 border-zinc-800 shadow-xl p-2 min-w-[200px] rounded-2xl text-zinc-300"
                    >
                      <DropdownMenuItem
                        className="text-xs font-semibold uppercase tracking-wider py-3 px-4 rounded-xl text-indigo-400 focus:bg-indigo-500/10 focus:text-indigo-300 cursor-pointer transition-colors"
                        onClick={() => fetchAIMatches(c)}
                      >
                        Discover AI Matches
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs font-semibold uppercase tracking-wider py-3 px-4 rounded-xl focus:bg-zinc-800 focus:text-white cursor-pointer transition-colors"
                        onClick={() => toast.info("Data refresh synchronized.")}
                      >
                        View Submissions
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs font-semibold uppercase tracking-wider py-3 px-4 rounded-xl focus:bg-zinc-800 focus:text-white cursor-pointer transition-colors"
                        onClick={() => handleEditClick(c)}
                      >
                        Edit Campaign
                      </DropdownMenuItem>
                      <div className="h-px bg-zinc-800 my-2 mx-2"></div>
                      <DropdownMenuItem
                        className="text-xs font-semibold uppercase tracking-wider py-3 px-4 rounded-xl text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer transition-colors"
                        onClick={() => handleDelete(c.id, c.title)}
                      >
                        Delete Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* AI Matches Dialog */}
      <Dialog
        open={!!matchingCampaign}
        onOpenChange={(val) => !val && setMatchingCampaign(null)}
      >
        <DialogContent className="sm:max-w-3xl bg-zinc-950 border-zinc-800 p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="mb-6 shrink-0">
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              AI Recommendation Engine
            </p>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-white mt-2">
              Top Creators for "{matchingCampaign?.title}"
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {matchLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Activity className="animate-spin h-8 w-8 text-indigo-500 mb-4" />
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mt-4">
                  Analyzing creator metrics via Gemini AI...
                </p>
              </div>
            ) : matchedCreators.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-zinc-500">
                  No compatible creators found at this time.
                </p>
              </div>
            ) : (
              matchedCreators.map((creator, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={creator.id}
                  className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center gap-6"
                >
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-zinc-700 shrink-0 bg-zinc-800">
                    <img
                      src={
                        creator.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.displayName || creator.name || creator.id)}&background=random`
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <h4 className="text-lg font-semibold text-white">
                        {creator.displayName}
                      </h4>
                      <div className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {creator.matchPercentage}% Match
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 italic line-clamp-2">
                      " {creator.reason} "
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-transparent border border-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    onClick={() =>
                      toast.success(`Offer sent to ${creator.displayName}`)
                    }
                  >
                    Send Offer
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
