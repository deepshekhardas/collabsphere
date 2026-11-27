import { useState, type FormEvent } from "react";
import { ArrowRight, ClipboardList, Compass, FolderKanban, Plus, RefreshCcw, Search } from "lucide-react";
import { Brand, Feedback, FocusCard, focusSection } from "./ui";
import "./workspace.css";

const sampleDrafts = ["Product launch · Draft", "Creator spotlight · Planning"];
const sampleCreators = [
  { name: "Sarah Content", niche: "Technology", audience: "120k", bio: "Explains new technology through short, practical lifestyle videos." },
  { name: "Alex Production", niche: "Video production", audience: "250k", bio: "Makes product films, interviews and short documentaries." },
  { name: "Creator Joy", niche: "Beauty", audience: "80k", bio: "Makes beauty tutorials and editorial product photography." },
];
const tabs = [
  { label: "Marketplace", icon: Search },
  { label: "Campaigns", icon: FolderKanban },
  { label: "Overview", icon: Compass },
] as const;
type DemoTab = typeof tabs[number]["label"];

export default function DemoWorkspace() {
  const [tab, setTab] = useState<DemoTab>("Marketplace");
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState(sampleDrafts);
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("");
  const matching = sampleCreators.filter((creator) => (creator.name + " " + creator.niche).toLowerCase().includes(query.trim().toLowerCase()));

  function reset() {
    setTab("Marketplace");
    setQuery("");
    setBrief("");
    setCampaigns(sampleDrafts);
    setMessage("Sample workspace reset.");
  }

  function addDraft(name: string) {
    setCampaigns((current) => [...current, name + " · Draft"]);
    setMessage(name + " was saved as a sample draft.");
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = brief.trim();
    if (!name) return;
    addDraft(name);
    setBrief("");
  }

  return (
    <div className="cs-app cs-demo">
      <a className="cs-skip" href="#demo-content">Skip to content</a>
      <header className="cs-topbar">
        <Brand />
        <div className="cs-actions">
          <button className="cs-button cs-quiet" onClick={reset}><RefreshCcw size={16} aria-hidden="true" /> Reset demo</button>
          <a className="cs-button cs-secondary" href="/">Account sign-in</a>
        </div>
      </header>
      <main id="demo-content" className="cs-main">
        <header className="cs-page-heading"><p className="cs-eyebrow">Sample workspace</p><h1>Sample Studio</h1><p>Browse illustrative creator profiles and save campaign drafts. Drafts reset when you reload.</p></header>
        <div className="cs-command-grid">
          <FocusCard label="Try a brand workflow" title="Find a creative partner." action={
            <button className="cs-button cs-inverse" onClick={() => { setTab("Marketplace"); focusSection("demo-marketplace"); }}>
              Browse creators <ArrowRight size={17} aria-hidden="true" />
            </button>
          }>Compare profiles and start a collaboration draft.</FocusCard>
          <div className="cs-metrics cs-demo-metrics">
            <button onClick={() => { setTab("Campaigns"); setMessage(""); }}><FolderKanban size={17} aria-hidden="true" /><small>Sample campaigns</small><strong>{campaigns.length}</strong></button>
            <button onClick={() => { setTab("Marketplace"); setMessage(""); }}><Search size={17} aria-hidden="true" /><small>Sample creators</small><strong>{sampleCreators.length}</strong></button>
          </div>
        </div>
        <nav className="cs-tabs" aria-label="Sample workspace sections">
          {tabs.map(({ label, icon: Icon }) => (
            <button key={label} aria-current={tab === label ? "page" : undefined} onClick={() => { setTab(label); setMessage(""); }}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <Feedback>{message}</Feedback>
        {tab === "Marketplace" && (
          <section id="demo-marketplace" tabIndex={-1} className="cs-panel">
            <div className="cs-panel-heading"><div><h2>Creator discovery</h2><p>These profiles are examples for exploring the workspace.</p></div></div>
            <label className="cs-demo-search">Search by name or specialty<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Video production" /></label>
            <p className="cs-sr-only" role="status">{matching.length} {matching.length === 1 ? "creator" : "creators"} shown</p>
            {matching.length ? <div className="cs-creator-grid">
              {matching.map((creator) => (
                <article className="cs-record" key={creator.name}>
                  <div className="cs-creator-avatar" aria-hidden="true">{creator.name[0]}</div>
                  <h3>{creator.name}</h3>
                  <small>{creator.niche} · {creator.audience} sample audience</small>
                  <p>{creator.bio}</p>
                  <button className="cs-button cs-secondary" onClick={() => addDraft(creator.name + " collaboration")}><Plus size={16} aria-hidden="true" /> Save collaboration draft</button>
                </article>
              ))}
            </div> : <div className="cs-empty"><Search size={23} aria-hidden="true" /><p>No creators match this search.</p></div>}
          </section>
        )}
        {tab === "Campaigns" && (
          <section className="cs-panel">
            <div className="cs-panel-heading"><div><h2>Campaign drafts</h2><p>Add a draft to see how campaigns are organized.</p></div></div>
            <form className="cs-search" onSubmit={submitDraft}>
              <label>Campaign name<input value={brief} onChange={(event) => setBrief(event.target.value)} required maxLength={100} /></label>
              <button className="cs-button cs-primary"><Plus size={16} aria-hidden="true" /> Add draft</button>
            </form>
            <ul className="cs-team-list">{campaigns.map((campaign, index) => <li key={index}><span><ClipboardList size={16} aria-hidden="true" /> {campaign}</span></li>)}</ul>
          </section>
        )}
        {tab === "Overview" && (
          <section className="cs-panel">
            <h2>Session overview</h2>
            <p>There are {campaigns.length} sample campaigns and {sampleCreators.length} sample creators in this session.</p>
            <p>Use Reset demo to clear the session’s drafts and return to the starting examples.</p>
          </section>
        )}
      </main>
    </div>
  );
}
