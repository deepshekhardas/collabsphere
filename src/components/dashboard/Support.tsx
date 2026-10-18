import React, { useState } from "react";
import {
  LifeBuoy,
  BookOpen,
  MessageCircle,
  FileQuestion,
  ExternalLink,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { toast } from "sonner";
import { User } from "firebase/auth";

interface SupportProps {
  user: User;
}

export function Support({ user }: SupportProps) {
  const [topic, setTopic] = useState("Billing Issue");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqs = [
    {
      q: "How do payouts work?",
      a: "Payouts are processed automatically every cycle to your connected bank account or wallet. A minimum balance of $50 is required.",
    },
    {
      q: "Can I dispute a campaign review?",
      a: "Yes, you can request a secondary review within 48 hours of receiving feedback. Our moderation team will step in.",
    },
    {
      q: "How do I upgrade my account?",
      a: "Go to Settings > Billing Details to manage your subscription tier and access premium features.",
    },
    {
      q: "What formats are supported for video uploads?",
      a: "We support MP4, MOV, and WebM up to 500MB per file. 1080p resolution or higher is recommended.",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "supportTickets"), {
        userId: user.uid,
        userEmail: user.email,
        topic,
        message,
        status: "open",
        createdAt: serverTimestamp(),
      });

      toast.success("Ticket submitted successfully", {
        description: "Our team will get back to you shortly.",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
      setMessage("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "supportTickets");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="border-b border-zinc-800 pb-8 focus:outline-none">
        <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2">
          Help Center
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
          Support & Resources
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Find answers, learn best practices, or get in touch with our team.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 group cursor-pointer hover:border-indigo-500/50 transition-colors">
          <BookOpen className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-medium text-white mb-2">Documentation</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Detailed guides on using the platform, from setup to advanced
            scripting.
          </p>
          <span className="text-xs font-medium text-indigo-400 flex items-center gap-1">
            Read Docs <ExternalLink className="w-3 h-3" />
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 group cursor-pointer hover:border-emerald-500/50 transition-colors">
          <MessageCircle className="w-8 h-8 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-medium text-white mb-2">
            Community Forum
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Connect with other creators and brands, share tips, and get
            community support.
          </p>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            Join Discussion <ExternalLink className="w-3 h-3" />
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 group cursor-pointer hover:border-amber-500/50 transition-colors">
          <LifeBuoy className="w-8 h-8 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-medium text-white mb-2">
            24/7 Live Chat
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Need immediate assistance? Talk directly with our support
            specialists.
          </p>
          <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
            Start Chat <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-indigo-400" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl"
              >
                <h4 className="text-sm font-medium text-white mb-2">{faq.q}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" />
            Contact Us
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors mt-1"
                >
                  <option>Billing Issue</option>
                  <option>Technical Bug</option>
                  <option>Feature Request</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Message
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors mt-1 resize-none"
                ></textarea>
              </div>
              <button
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
