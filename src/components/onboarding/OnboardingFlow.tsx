import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import { ai, MODELS } from "@/lib/gemini";
import {
  Check,
  ArrowRight,
  Loader2,
  Sparkles,
  Shield,
  Cpu,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"business" | "creator">("business");

  // Business State
  const [businessData, setBusinessData] = useState({
    name: "",
    industry: "",
    targetAudience: "",
    offer: "",
    pricePoint: "",
    platforms: [] as string[],
    monthlyBudget: "",
  });

  // Creator State
  const [creatorData, setCreatorData] = useState({
    displayName: "",
    bio: "",
    niche: [] as string[],
    platforms: [] as string[],
    audienceSize: "",
  });

  const handleBusinessSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = `businessProfiles/${auth.currentUser.uid}`;
    try {
      const prompt = `Based on the following business details, generate a compelling brand summary, logo concept description, and funnel strategy.
      Business Name: ${businessData.name}
      Industry: ${businessData.industry}
      Target Audience: ${businessData.targetAudience}
      Offer: ${businessData.offer}
      Price Point: ${businessData.pricePoint}
      
      Format the response as a clear, professional summary.`;

      const response = await ai.models.generateContent({
        model: MODELS.flash,
        contents: [{ parts: [{ text: prompt }] }],
      });

      const brandSummary = response.text || "";

      await setDoc(doc(db, "businessProfiles", auth.currentUser.uid), {
        ...businessData,
        brandSummary,
        id: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        role: "business",
        onboarded: true,
      });

      toast.success("Operational protocol initiated. Welcome to CollabSphere.");
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatorSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = `creatorProfiles/${auth.currentUser.uid}`;
    try {
      await setDoc(doc(db, "creatorProfiles", auth.currentUser.uid), {
        displayName: creatorData.displayName,
        bio: creatorData.bio,
        platforms: creatorData.platforms,
        audienceSize: creatorData.audienceSize,
        id: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        role: "creator",
        onboarded: true,
      });

      toast.success("Talent node established. Welcome to CollabSphere.");
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    "TikTok",
    "Instagram",
    "YouTube",
    "Podcast",
    "LinkedIn",
    "Twitter",
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>

      {/* Operational Rail */}
      <header className="h-20 border-b border-zinc-800/80 flex items-center justify-between px-8 relative z-30 bg-zinc-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="h-4 w-4 bg-black rounded-sm rotate-45"></div>
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
              Collab<span className="text-indigo-400">Sphere</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
              Initialization Protocol
            </span>
          </div>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>
              Enc_Primary: <span className="text-zinc-300">SECURE_L_04</span>
            </span>
          </div>
          <div className="flex items-center gap-2 hidden sm:flex">
            <Cpu className="h-4 w-4 text-indigo-500" />
            <span>
              Neural_Path:{" "}
              <span className="text-zinc-300">{role.toUpperCase()}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8 relative z-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-3xl"
            >
              <div className="card p-12 bg-zinc-900 shadow-2xl relative overflow-hidden">
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <p className="label text-indigo-400">
                      Phase 01 / Persona Initialization
                    </p>
                    <span className="text-4xl font-semibold text-zinc-800">
                      01
                    </span>
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                    Choose your
                    <br />
                    <span className="text-zinc-500">Strategic role.</span>
                  </h2>
                  <p className="text-zinc-400 text-base max-w-lg">
                    Select the operational modality through which you will
                    interact with the secure strategic ecosystem.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 mt-12">
                  <button
                    className={cn(
                      "h-64 rounded-xl border-2 transition-all duration-300 flex flex-col p-8 justify-between relative group overflow-hidden",
                      role === "business"
                        ? "border-indigo-500 bg-indigo-900/20 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800",
                    )}
                    onClick={() => setRole("business")}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center transition-all duration-300",
                          role === "business"
                            ? "bg-indigo-500 text-white"
                            : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300",
                        )}
                      >
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Type A
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-semibold tracking-tight text-white mb-1">
                        Institutional
                      </p>
                      <p className="text-sm font-medium text-zinc-500">
                        Scalable Enterprise Node
                      </p>
                    </div>
                  </button>

                  <button
                    className={cn(
                      "h-64 rounded-xl border-2 transition-all duration-300 flex flex-col p-8 justify-between relative group overflow-hidden",
                      role === "creator"
                        ? "border-emerald-500 bg-emerald-900/20 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800",
                    )}
                    onClick={() => setRole("creator")}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center transition-all duration-300",
                          role === "creator"
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300",
                        )}
                      >
                        <Check className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Type B
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-semibold tracking-tight text-white mb-1">
                        Individual
                      </p>
                      <p className="text-sm font-medium text-zinc-500">
                        Talent Network Node
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-end relative z-10">
                  <button
                    onClick={() => setStep(2)}
                    className="btn-primary group"
                  >
                    Continue Protocol{" "}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="form-step"
              initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-4xl"
            >
              <div className="card p-12 bg-zinc-900 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p
                      className={cn(
                        "label",
                        role === "business"
                          ? "text-indigo-400"
                          : "text-emerald-400",
                      )}
                    >
                      Phase 02 / Strategic Intelligence
                    </p>
                    <span className="text-4xl font-semibold text-zinc-800">
                      02
                    </span>
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                    Operational
                    <br />
                    <span className="text-zinc-500">Parameters.</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mt-12">
                  {role === "business" ? (
                    <>
                      <div className="space-y-2">
                        <label className="label">Institutional Name</label>
                        <input
                          className="w-full bg-transparent border-b-2 border-zinc-800 text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors py-2"
                          value={businessData.name}
                          onChange={(e) =>
                            setBusinessData({
                              ...businessData,
                              name: e.target.value,
                            })
                          }
                          placeholder="Corporation Node"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="label">Market Sector</label>
                        <input
                          className="w-full bg-transparent border-b-2 border-zinc-800 text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors py-2"
                          value={businessData.industry}
                          onChange={(e) =>
                            setBusinessData({
                              ...businessData,
                              industry: e.target.value,
                            })
                          }
                          placeholder="Retail / High Tech"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="label">Strategic Objective</label>
                        <textarea
                          className="w-full min-h-[120px] bg-zinc-950 rounded-xl border border-zinc-800 text-base font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 p-4 transition-colors"
                          value={businessData.offer}
                          onChange={(e) =>
                            setBusinessData({
                              ...businessData,
                              offer: e.target.value,
                            })
                          }
                          placeholder="Define core value extraction..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="label">Liquidity Target ($)</label>
                        <input
                          className="w-full bg-transparent border-b-2 border-zinc-800 text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors py-2"
                          value={businessData.monthlyBudget}
                          onChange={(e) =>
                            setBusinessData({
                              ...businessData,
                              monthlyBudget: e.target.value,
                            })
                          }
                          placeholder="50,000.00"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="label">Professional Alias</label>
                        <input
                          className="w-full bg-transparent border-b-2 border-zinc-800 text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors py-2"
                          value={creatorData.displayName}
                          onChange={(e) =>
                            setCreatorData({
                              ...creatorData,
                              displayName: e.target.value,
                            })
                          }
                          placeholder="@talent_node_01"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="label">Aggregate Reach</label>
                        <input
                          className="w-full bg-transparent border-b-2 border-zinc-800 text-2xl font-semibold tracking-tight text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors py-2"
                          value={creatorData.audienceSize}
                          onChange={(e) =>
                            setCreatorData({
                              ...creatorData,
                              audienceSize: e.target.value,
                            })
                          }
                          placeholder="500K+ Networks"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="label">Talent Narrative</label>
                        <textarea
                          className="w-full min-h-[120px] bg-zinc-950 rounded-xl border border-zinc-800 text-base font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 p-4 transition-colors"
                          value={creatorData.bio}
                          onChange={(e) =>
                            setCreatorData({
                              ...creatorData,
                              bio: e.target.value,
                            })
                          }
                          placeholder="Define your creative influence objective..."
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-4 md:col-span-2">
                    <label className="label">Distribution Nodes</label>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((p) => {
                        const isSelected =
                          role === "business"
                            ? businessData.platforms.includes(p)
                            : creatorData.platforms.includes(p);
                        return (
                          <button
                            key={p}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border",
                              isSelected
                                ? "bg-white text-black border-white"
                                : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white bg-zinc-900",
                            )}
                            onClick={() => {
                              if (role === "business") {
                                const newP = isSelected
                                  ? businessData.platforms.filter(
                                      (x) => x !== p,
                                    )
                                  : [...businessData.platforms, p];
                                setBusinessData({
                                  ...businessData,
                                  platforms: newP,
                                });
                              } else {
                                const newP = isSelected
                                  ? creatorData.platforms.filter((x) => x !== p)
                                  : [...creatorData.platforms, p];
                                setCreatorData({
                                  ...creatorData,
                                  platforms: newP,
                                });
                              }
                            }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="text-zinc-500 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={
                      role === "business"
                        ? handleBusinessSubmit
                        : handleCreatorSubmit
                    }
                    disabled={loading}
                    className="btn-primary"
                  >
                    <span className="flex items-center gap-2">
                      {loading ? (
                        <Loader2 className="animate-spin h-5 w-5" />
                      ) : null}
                      {loading
                        ? "Optimizing Node..."
                        : "Initiate System Uplink"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-16 border-t border-zinc-800 px-8 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-zinc-600 relative z-30 bg-zinc-950/20 backdrop-blur-3xl shrink-0">
        <div className="flex gap-8">
          <span>
            Auth_Chain: <span className="text-zinc-400">SECURE_L_04</span>
          </span>
          <span className="hidden md:inline">
            Protocol: <span className="text-indigo-400">ONBOARDING_SYNC</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          CollabSphere <span className="text-emerald-500">•</span>{" "}
          <span className="text-zinc-500">All Systems Nominal</span>
        </div>
      </footer>
    </div>
  );
}
