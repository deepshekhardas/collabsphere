import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import { ai, MODELS } from "@/lib/gemini";
import {
  Loader2,
  Sparkles,
  Copy,
  ArrowRight,
  Layers,
  Zap,
  Network,
  Terminal,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ScriptingProps {
  profile: any;
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Directive duplicated to buffer.");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-md transition-colors ${copied ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-zinc-800 text-zinc-400 hover:text-white"}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function Scripting({ profile }: ScriptingProps) {
  const [activeType, setActiveType] = useState("ads");
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const scriptTypes = [
    { id: "ads", label: "Ads", description: "Conversion hooks" },
    { id: "vsl", label: "VSL", description: "Sales letters" },
    { id: "webinar", label: "Webinar", description: "Full outlines" },
    { id: "creator", label: "Creator", description: "Talking points" },
    { id: "email", label: "Email", description: "Sequences" },
    { id: "sms", label: "SMS", description: "Broadcasts" },
  ];

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    const path = "scripts";
    const q = query(
      collection(db, path),
      where("businessId", "==", profile.id),
      where("type", "==", activeType),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setScripts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [activeType, profile?.id]);

  const generateScript = async () => {
    setGenerating(true);
    const path = "scripts";
    try {
      const typeLabel = scriptTypes.find((t) => t.id === activeType)?.label;
      const prompt = `Generate a highly effective ${typeLabel} script for the following business:
      Name: ${profile.name}
      Industry: ${profile.industry}
      Offer: ${profile.offer}
      Target Audience: ${profile.targetAudience}
      
      The script should be professional, persuasive, and optimized for conversions.
      Include a clear Title and then the Script content.`;

      const response = await ai.models.generateContent({
        model: MODELS.flash,
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text = response.text || "";
      const [title, ...contentLines] = text.split("\n");
      const content = contentLines.join("\n").trim();

      const newScript = {
        businessId: profile.id,
        type: activeType,
        title: title.replace(/^#+\s*/, "") || `New ${typeLabel} Script`,
        content: content || text,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, path), newScript);
      setScripts([{ id: docRef.id, ...newScript }, ...scripts]);
      toast.success(`${typeLabel} narrative synthesized.`, {
        description: "Optimized for high-intent conversion.",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setGenerating(false);
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
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <div className="flex flex-col space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-800 pb-8"
      >
        <div className="space-y-4">
          <p className="label flex items-center gap-2 text-indigo-400">
            <Terminal className="h-4 w-4 animate-pulse" />
            Neural Engine / Section 04
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-2">
            Script Architect
          </h1>
        </div>
        <div className="flex gap-4 pb-2">
          <button
            onClick={generateScript}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Execute Synthesis
          </button>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="lg:col-span-1 space-y-2"
        >
          <p className="label mb-6">Vertical Selection</p>
          {scriptTypes.map((type) => (
            <motion.button
              key={type.id}
              variants={item}
              onClick={() => setActiveType(type.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between group",
                activeType === type.id
                  ? "bg-zinc-800/80 border-zinc-700 text-white"
                  : "border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200",
              )}
            >
              <div>
                <span className="block text-sm font-medium">{type.label}</span>
                <span className="block text-xs opacity-70 mt-0.5">
                  {type.description}
                </span>
              </div>
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  activeType === type.id
                    ? "text-white"
                    : "opacity-0 group-hover:opacity-100",
                )}
              />
            </motion.button>
          ))}
        </motion.div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-32 rounded-xl border border-zinc-800 bg-zinc-900/30"
              >
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin h-8 w-8 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-400 animate-pulse">
                    Neural Linkage Active
                  </p>
                </div>
              </motion.div>
            ) : scripts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card text-center py-20 border-dashed border-zinc-800"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="h-16 w-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
                    <Layers className="h-8 w-8 text-zinc-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-300 font-medium">
                      No Protocol Outputs
                    </p>
                    <p className="text-sm text-zinc-500">
                      Awaiting strategic parameters for narrative synthesis.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-16"
              >
                {scripts.map((script) => (
                  <motion.div
                    key={script.id}
                    variants={item}
                    className="card group"
                  >
                    <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                            Optimization Result
                          </span>
                        </div>
                        <h3 className="text-2xl font-semibold tracking-tight text-white">
                          {script.title}
                        </h3>
                      </div>
                      <CopyButton content={script.content} />
                    </div>
                    <div className="pl-4 border-l-2 border-zinc-800">
                      <p className="text-lg leading-relaxed text-zinc-300 whitespace-pre-wrap">
                        {script.content}
                      </p>
                    </div>
                    <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 animate-pulse"></div>
                      <span className="text-xs font-medium text-zinc-500">
                        AI Optimized Matrix Sync
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
