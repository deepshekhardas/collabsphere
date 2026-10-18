import React, { useState, useEffect, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

// Code Splitting / Lazy Loading
const AuthOverlay = React.lazy(() =>
  import("@/components/auth/AuthOverlay").then((m) => ({
    default: m.AuthOverlay,
  })),
);
const OnboardingFlow = React.lazy(() =>
  import("@/components/onboarding/OnboardingFlow").then((m) => ({
    default: m.OnboardingFlow,
  })),
);
const BusinessDashboard = React.lazy(() =>
  import("@/components/dashboard/BusinessDashboard").then((m) => ({
    default: m.BusinessDashboard,
  })),
);
const CreatorDashboard = React.lazy(() =>
  import("@/components/dashboard/CreatorDashboard").then((m) => ({
    default: m.CreatorDashboard,
  })),
);

const SuspenseLoader = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] bg-dot-pattern relative overflow-hidden">
    <div className="relative z-10 flex flex-col items-center gap-8">
      <div className="h-px w-24 bg-white/10 overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="h-full w-full bg-rose-500 opacity-60"
        />
      </div>
      <p className="text-zinc-500 text-xs font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
        Loading...
      </p>
    </div>
  </div>
);

function AccountApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        toast.info("Notifications Panel", {
          description: "You have 0 new system alerts.",
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: () => void;
    let unsubscribeProfileDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        unsubscribeUserDoc = onSnapshot(
          doc(db, "users", u.uid),
          (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              let extendedProfile = { ...userData, id: u.uid };

              if (userData.onboarded) {
                const profileCollection =
                  userData.role === "business"
                    ? "businessProfiles"
                    : "creatorProfiles";

                if (unsubscribeProfileDoc) unsubscribeProfileDoc();

                unsubscribeProfileDoc = onSnapshot(
                  doc(db, profileCollection, u.uid),
                  (profileDoc) => {
                    if (profileDoc.exists()) {
                      setProfile({ ...extendedProfile, ...profileDoc.data() });
                    } else {
                      setProfile(extendedProfile);
                    }
                    setLoading(false);
                  },
                  () => {
                    setProfile(extendedProfile);
                    setLoading(false);
                  },
                );
              } else {
                setProfile(extendedProfile);
                setLoading(false);
              }
            } else {
              setProfile(null);
              setLoading(false);
            }
          },
          () => {
            setLoading(false);
          },
        );
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        if (unsubscribeProfileDoc) unsubscribeProfileDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeProfileDoc) unsubscribeProfileDoc();
    };
  }, []);

  const refreshProfile = async (uid: string) => {
    // This is kept for backward compat with OnboardingFlow if needed
    // But onSnapshot should handle the updates now.
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] bg-dot-pattern relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="h-px w-24 bg-white/10 overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
              className="h-full w-full bg-rose-500 opacity-60"
            />
          </div>
          <p className="text-zinc-500 text-xs font-semibold tracking-[0.2em] uppercase">
            Initializing Systems
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<SuspenseLoader />}>
        <AuthOverlay />
        <Toaster />
      </Suspense>
    );
  }

  if (profile && !profile.onboarded) {
    return (
      <Suspense fallback={<SuspenseLoader />}>
        <OnboardingFlow onComplete={() => refreshProfile(user.uid)} />
        <Toaster />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100 bg-[#0a0a0a] bg-dot-pattern relative">
      <div className="relative z-10 w-full h-full">
        <Suspense fallback={<SuspenseLoader />}>
          {profile?.role === "business" ? (
            <BusinessDashboard user={user} profile={profile} />
          ) : (
            <CreatorDashboard user={user} profile={profile} />
          )}
        </Suspense>
      </div>
      <Toaster />
    </div>
  );
}

function DemoWorkspace() {
  const [tab, setTab] = useState('Marketplace');
  const [query, setQuery] = useState('');
  const [campaigns, setCampaigns] = useState(['Product launch · Draft', 'Creator spotlight · Planning']);
  const [brief, setBrief] = useState('');
  const [message, setMessage] = useState('');
  const creators = [
    {name:'Sarah Content',niche:'Tech',audience:'120k',bio:'Sample profile for technology and lifestyle campaigns.'},
    {name:'Alex Production',niche:'Production',audience:'250k',bio:'Sample profile for video production and storytelling.'},
    {name:'Creator Joy',niche:'Beauty',audience:'80k',bio:'Sample profile for beauty and fashion content.'},
  ];
  return <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
    <header className="border-b border-white/10 p-5 flex flex-wrap gap-4 items-center justify-between">
      <div><h1 className="text-xl font-bold">Collab<span className="text-rose-400">Sphere</span></h1><p className="text-xs text-zinc-400 mt-1">Independent portfolio demo · Sample Studio</p></div>
      <button className="border border-white/20 rounded-lg px-4 py-2" onClick={()=>{setTab('Marketplace');setQuery('');setBrief('');setCampaigns(['Product launch · Draft','Creator spotlight · Planning']);setMessage('Demo reset. No account data was changed.');}}>Reset demo</button>
    </header>
    <div className="max-w-6xl mx-auto p-5 sm:p-8">
      <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100 mb-6">Illustrative profiles and local drafts only. No messages, offers, payments or contracts are sent. Changes disappear when you reload.</p>
      <nav aria-label="Demo sections" className="flex flex-wrap gap-2 mb-8">{['Marketplace','Campaigns','Overview'].map(item=><button key={item} aria-pressed={tab===item} onClick={()=>{setTab(item);setMessage('');}} className={'px-5 py-3 rounded-full border '+(tab===item?'border-rose-400 bg-rose-400/10':'border-white/15')}>{item}</button>)}</nav>
      {message && <p role="status" className="mb-6 rounded-lg bg-emerald-400/10 p-4 text-emerald-100">{message}</p>}
      {tab==='Marketplace' && <><h2 className="text-3xl sm:text-5xl font-bold mb-3">Find your next creative partner.</h2><p className="text-zinc-400 mb-6">Compare illustrative creator profiles and save a local campaign draft.</p><label className="block mb-8">Search creators<input className="mt-2 block w-full max-w-lg rounded-lg border border-white/20 p-3 bg-zinc-900" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or niche" /></label><div className="grid gap-5 md:grid-cols-3">{creators.filter(c=>(c.name+' '+c.niche).toLowerCase().includes(query.toLowerCase())).map(c=><article className="rounded-2xl border border-white/10 bg-zinc-900 p-6" key={c.name}><div aria-hidden="true" className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-200 flex items-center justify-center text-2xl mb-5">{c.name[0]}</div><p className="text-xs uppercase tracking-widest text-rose-300">Sample creator</p><h3 className="text-xl mt-2 font-semibold">{c.name}</h3><p className="text-zinc-400 my-4">{c.bio}</p><p className="text-sm mb-5">{c.niche} · {c.audience} illustrative audience</p><button className="rounded-lg bg-rose-400 text-black px-4 py-3 font-semibold" onClick={()=>{setCampaigns(p=>[...p,c.name+' collaboration · Draft']);setMessage('Local draft added for '+c.name+'. No offer was sent.');}}>Save collaboration draft</button></article>)}</div>{!creators.some(c=>(c.name+' '+c.niche).toLowerCase().includes(query.toLowerCase()))&&<p>No matching sample creators. Try another name or niche.</p>}</>}
      {tab==='Campaigns' && <><h2 className="text-3xl font-semibold mb-6">Campaign drafts</h2><form onSubmit={e=>{e.preventDefault();if(!brief.trim())return;setCampaigns(p=>[...p,brief.trim()+' · Draft']);setBrief('');setMessage('Campaign saved in this demo session only.');}} className="flex flex-wrap gap-3 mb-6"><label className="flex-1 min-w-0">Campaign name<input required maxLength={100} className="block w-full bg-zinc-900 border border-white/20 rounded-lg p-3 mt-2" value={brief} onChange={e=>setBrief(e.target.value)}/></label><button className="rounded-lg bg-rose-400 text-black px-5 py-3 self-end">Add local draft</button></form><ul className="space-y-3">{campaigns.map((c,i)=><li key={i} className="rounded-lg border border-white/10 p-4 break-words">{c}</li>)}</ul></>}
      {tab==='Overview' && <><h2 className="text-3xl font-semibold mb-6">Sample Studio</h2><div className="grid sm:grid-cols-2 gap-4"><div className="border border-white/10 rounded-xl p-6"><p className="text-zinc-400">Local campaign drafts</p><p className="text-4xl mt-3">{campaigns.length}</p></div><div className="border border-white/10 rounded-xl p-6"><p className="text-zinc-400">Illustrative creator profiles</p><p className="text-4xl mt-3">3</p></div></div><p className="mt-6 text-zinc-400">Use Marketplace to compare creators, Campaigns to add a draft, or Reset demo to start again. This workspace never reads your saved account profile.</p></>}
    </div>
  </div>;
}

export default function App() {
  return new URLSearchParams(window.location.search).get('demo') === '1' ? <DemoWorkspace /> : <AccountApp />;
}
