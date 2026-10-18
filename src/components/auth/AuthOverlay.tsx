import React from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";

import { toast } from "sonner";

export function AuthOverlay() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Initial setup - default to business for now, onboarding will allow change
        await setDoc(userRef, {
          email: user.email,
          role: "business",
          onboarded: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === "auth/popup-blocked") {
        toast.error(
          "Sign-in popup blocked. Please enable popups or try opening the app in a new tab.",
          {
            duration: 6000,
          },
        );
      } else if (error.code === "auth/cancelled-popup-request") {
        // Ignore user cancellation
      } else {
        toast.error("Failed to sign in. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 px-4 overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

          <div className="text-center space-y-6 relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              <div className="h-6 w-6 bg-black rotate-45 rounded-sm"></div>
            </motion.div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Collab<span className="text-indigo-400">Sphere</span>
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[260px] mx-auto">
                Connect. Create. Monetize. The premier platform for
                creator-brand collaborations.
              </p>
            </div>
          </div>

          <div className="pt-8 relative z-10">
            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-zinc-200 text-black h-14 rounded-full flex items-center justify-center gap-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              <LogIn className="h-5 w-5" />
              <span>Continue with Google</span>
            </button>

            <div className="mt-8 pt-6 border-t border-zinc-800/50 flex justify-between items-center text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
              <span>Secure Access</span>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-emerald-400">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
