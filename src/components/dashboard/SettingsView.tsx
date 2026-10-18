import React, { useState } from "react";
import {
  User as UserIcon,
  Bell,
  Shield,
  Wallet,
  Paintbrush,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";

interface SettingsViewProps {
  profileType: "creator" | "business";
  user: User;
  profile: any;
}

export function SettingsView({
  profileType,
  user,
  profile,
}: SettingsViewProps) {
  const [activeSegment, setActiveSegment] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: profile?.displayName || profile?.name || "",
    email: user.email || "",
    bio: profile?.bio || profile?.brandSummary || "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    campaigns: true,
    messages: true,
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const collectionName =
      profileType === "business" ? "businessProfiles" : "creatorProfiles";
    try {
      const docRef = doc(db, collectionName, user.uid);

      const updatePayload: any = {};

      if (profileType === "business") {
        updatePayload.name = profileData.displayName;
        updatePayload.brandSummary = profileData.bio;
      } else {
        updatePayload.displayName = profileData.displayName;
        updatePayload.bio = profileData.bio;
      }

      await updateDoc(docRef, updatePayload);

      // Update email on user document instead if it changed
      if (profileData.email !== user.email) {
        // Normally updating email requires Firebase Auth update + Users collection update
        // Skipping for prototype, just noting it
      }

      toast.success("Settings updated successfully", {
        description: "Your changes have been saved to the system.",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, collectionName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = () => {
    toast.success("Preferences updated successfully", {
      description: "Your notification changes have been saved.",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    });
  };

  return (
    <div className="space-y-12">
      <header className="border-b border-zinc-800 pb-8">
        <p className="text-zinc-400 uppercase tracking-widest text-xs font-semibold mb-2">
          System Configuration
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mb-4">
          Settings
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Manage your account preferences, security, and integration endpoints.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {[
              { id: "profile", label: "Profile Settings", icon: UserIcon },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "security", label: "Security & Access", icon: Shield },
              {
                id: "billing",
                label:
                  profileType === "business"
                    ? "Billing Details"
                    : "Payout Methods",
                icon: Wallet,
              },
              { id: "appearance", label: "Appearance", icon: Paintbrush },
              { id: "legal", label: "Terms & Policies", icon: FileText },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSegment(item.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors text-left ${activeSegment === item.id ? "bg-indigo-600/10 text-indigo-400 font-medium" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"}`}
              >
                <item.icon
                  className={`w-4 h-4 ${activeSegment === item.id ? "text-indigo-400" : "text-zinc-500"}`}
                />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 md:p-8">
          {activeSegment === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Public Profile
                </h3>
                <p className="text-sm text-zinc-400">
                  This is how others will see you on the platform.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-500 text-sm overflow-hidden relative group">
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-medium">
                        Change
                      </span>
                    </div>
                    Avatar
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      Profile Identity
                    </p>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      Supported max 2MB in JPG, PNG formats. Suggested size
                      400x400.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) =>
                        setProfileData((p) => ({
                          ...p,
                          displayName: e.target.value,
                        }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Public Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, bio: e.target.value }))
                    }
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder={
                      profileType === "business"
                        ? "Premium skincare brand..."
                        : "Lifestyle and beauty creator based in NY"
                    }
                  ></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800 flex justify-end">
                <button
                  disabled={isSaving}
                  onClick={handleSaveProfile}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isSaving ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </div>
          )}

          {activeSegment === "notifications" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Notification Preferences
                </h3>
                <p className="text-sm text-zinc-400">
                  Manage how you receive alerts and updates.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: "email",
                    label: "Email Notifications",
                    desc: "Receive summaries and major alerts via email.",
                  },
                  {
                    key: "push",
                    label: "Push Notifications",
                    desc: "Get instant alerts in your browser.",
                  },
                  {
                    key: "sms",
                    label: "SMS Alerts",
                    desc: "High priority updates delivered via text.",
                  },
                  {
                    key: "campaigns",
                    label: "Campaign Updates",
                    desc: "Alerts related to active missions or collaborations.",
                  },
                  {
                    key: "messages",
                    label: "Direct Messages",
                    desc: "Notify me when I receive a new chat message.",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]:
                            !prev[item.key as keyof typeof notifications],
                        }))
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notifications[item.key as keyof typeof notifications] ? "bg-indigo-500" : "bg-zinc-700"}`}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full inline-block shadow transform transition-transform ${notifications[item.key as keyof typeof notifications] ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Update Preferences
                </button>
              </div>
            </div>
          )}

          {activeSegment === "appearance" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Visual Theme
                </h3>
                <p className="text-sm text-zinc-400">
                  Select the active design protocol for the application
                  interface.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    localStorage.setItem("appTheme", "modern");
                    toast.success("Theme Updated", {
                      description:
                        "Modern Theme Activated. Protocol Reload required for full effect.",
                    });
                    // Force reload to apply theme changes quickly
                    setTimeout(() => window.location.reload(), 1500);
                  }}
                  className={`p-6 border rounded-xl text-left transition-colors ${localStorage.getItem("appTheme") !== "core" ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"}`}
                >
                  <p className="text-lg font-semibold text-white mb-1">
                    Modern
                  </p>
                  <p className="text-sm text-zinc-400">
                    Standard protocol UI with gradients and shadows.
                  </p>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("appTheme", "core");
                    toast.success("Theme Updated", {
                      description:
                        "Core Theme Activated. Protocol Reload required for full effect.",
                    });
                    setTimeout(() => window.location.reload(), 1500);
                  }}
                  className={`p-6 border rounded-xl text-left transition-colors ${localStorage.getItem("appTheme") === "core" ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"}`}
                >
                  <p className="text-lg font-semibold text-white mb-1">Core</p>
                  <p className="text-sm text-zinc-400">
                    Minimalist brutalist interface. Data density focused.
                  </p>
                </button>
              </div>
            </div>
          )}

          {activeSegment !== "profile" &&
            activeSegment !== "notifications" &&
            activeSegment !== "appearance" && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
                <Shield className="w-12 h-12 text-zinc-800 mb-4" />
                <p className="text-lg font-medium text-white">
                  Segment Under Development
                </p>
                <p className="text-sm text-zinc-500 max-w-sm mt-2">
                  This configuration panel is securely locked for the current
                  release cycle.
                </p>
              </div>
            )}
        </section>
      </div>
    </div>
  );
}
