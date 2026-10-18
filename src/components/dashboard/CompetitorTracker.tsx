import React, { useState } from "react";
import { ai, MODELS } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  Zap,
  Crosshair,
  BarChart,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CompetitorTracker() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const performAnalysis = async () => {
    if (!query) return;
    setLoading(true);
    setAnalysis(null);

    const prompt = `Perform a high-level competitor analysis for the brand or website: ${query}.
Focus on:
1. Target Demographics & Core Offerings
2. Content Strategy & Tone (What kind of creators do they use?)
3. Strengths & Weaknesses in their marketing
4. Opportunities for a rival brand.

Format this using markdown with clear headings, bullet points, and concise insights.`;

    try {
      const response = await ai.models.generateContent({
        model: MODELS.flash,
        contents: [{ parts: [{ text: prompt }] }],
      });
      setAnalysis(response.text || "No insights could be generated.");
    } catch (error) {
      console.error(error);
      setAnalysis(
        "Error gathering intelligence. Ensure API proxy is connecting.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      <header className="border-b border-zinc-800 pb-8">
        <p className="label flex items-center gap-2 text-rose-400 mb-4">
          <Crosshair className="h-4 w-4 animate-pulse" />
          Intelligence / Competitor Radar
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
          Market Intelligence
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl">
          Deploy AI to analyze competitor marketing strategies, creator
          partnerships, and content gaps instantly.
        </p>
      </header>

      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-4 max-w-3xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-rose-400 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Enter competitor name or domain (e.g. Nike, Gymshark)..."
              className="w-full h-14 pl-12 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-400/50 transition-all text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performAnalysis()}
            />
          </div>
          <button
            onClick={performAnalysis}
            disabled={loading || !query}
            className="h-14 px-8 bg-zinc-100 hover:bg-zinc-300 text-black font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            Analyze
          </button>
        </div>
      </div>

      <AnimatePresence>
        {analysis && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 md:p-12 border-rose-900/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/20"
          >
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp className="h-6 w-6 text-rose-400" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Intelligence Brief: {query}
              </h2>
            </div>

            <div className="prose prose-invert prose-rose max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300">
              <div
                dangerouslySetInnerHTML={{
                  __html: analysis
                    .replace(/\n/g, "<br/>")
                    .replace(
                      /\*\*([^*]+)\*\*/g,
                      '<strong class="text-rose-200">\$1</strong>',
                    ),
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
