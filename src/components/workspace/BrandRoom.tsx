import { useCallback, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Building2, ClipboardCheck, ClipboardList, Copy, FolderKanban, Handshake, Plus, RefreshCw, Search, Users } from "lucide-react";
import type { BrandWorkspace, Campaign, CreatorProfile } from "@/types/workspace";
import { date, needsOfferAction, OfferList, type OfferFilter } from "./OfferList";
import { Feedback, FocusCard, LoadingWorkspace, focusSection } from "./ui";
import { useResource, type Api, type Perform } from "./api-client";

type Tab = "campaigns" | "offers" | "creators" | "team";

interface RoomProps {
  workspaceId: string;
  api: Api;
  perform: Perform;
  busy: boolean;
  revision: number;
}

export function BrandRoom({ workspaceId, api, perform, busy, revision }: RoomProps) {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const path = "/workspaces/" + workspaceId;
  const load = useCallback((signal: AbortSignal) => api<BrandWorkspace>(path, { signal }), [api, path]);
  const { data, error } = useResource(load, revision + refresh);

  if (error) return <><Feedback error>{error}</Feedback><button className="cs-button cs-secondary" onClick={() => setRefresh((value) => value + 1)}>Retry workspace</button></>;
  if (!data) return <LoadingWorkspace label="Loading brand workspace" />;
  const open = data.campaigns.filter((campaign) => campaign.status === "open");
  const ready = data.offers.filter((offer) => needsOfferAction(offer, "brand"));
  const next = ready[0];
  const drafts = data.campaigns.some((campaign) => campaign.status === "draft");
  const nextStep = next
    ? { title: "A deliverable is ready.", detail: next.campaignTitle + " · " + next.creatorName, label: "Open review queue", tab: "offers" as const, focus: "offer-list" }
    : open.length
      ? { title: "Find the right creator.", detail: "You have an open campaign ready for a new collaboration.", label: "Find creators", tab: "creators" as const, focus: "directory-panel" }
      : { title: drafts ? "Get a brief ready to share." : "Start with a campaign brief.", detail: drafts ? "Open a draft when the deliverables and scope are clear." : "Describe the work before you send your first offer.", label: "Go to campaigns", tab: "campaigns" as const, focus: "campaigns-panel" };

  return (
    <>
      <header className="cs-page-heading cs-brand-heading">
        <div><p className="cs-eyebrow"><Building2 size={15} aria-hidden="true" /> Brand workspace <span>·</span> {data.workspace.role}</p><h1>{data.workspace.name}</h1><p>Manage your briefs, partnerships and creative delivery.</p></div>
        <button className="cs-button cs-secondary" disabled={busy} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
      </header>
      <div className="cs-command-grid">
        <FocusCard label="Next for the brand" title={nextStep.title} action={
          <button className="cs-button cs-inverse" onClick={() => {
            if (nextStep.tab === "offers") setOfferFilter("action");
            setTab(nextStep.tab);
            focusSection(nextStep.focus);
          }}>
            {nextStep.label} <ArrowRight size={17} aria-hidden="true" />
          </button>
        }>{nextStep.detail}</FocusCard>
        <div className="cs-metrics" aria-label="Workspace activity at a glance">
          <button onClick={() => { setTab("campaigns"); focusSection("campaigns-panel"); }}><FolderKanban size={17} aria-hidden="true" /><small>Open campaigns</small><strong>{open.length}</strong></button>
          <button onClick={() => { setOfferFilter("all"); setTab("offers"); focusSection("offer-list"); }}><Handshake size={17} aria-hidden="true" /><small>Offers</small><strong>{data.offers.length}</strong></button>
          <button onClick={() => { setOfferFilter("action"); setTab("offers"); focusSection("offer-list"); }}><ClipboardCheck size={17} aria-hidden="true" /><small>Ready for review</small><strong>{ready.length}</strong></button>
        </div>
      </div>
      <nav className="cs-tabs" aria-label="Brand workspace sections">
        <button aria-current={tab === "campaigns" ? "page" : undefined} onClick={() => setTab("campaigns")}><FolderKanban size={17} aria-hidden="true" /> Campaigns</button>
        <button aria-current={tab === "offers" ? "page" : undefined} onClick={() => setTab("offers")}><ClipboardCheck size={17} aria-hidden="true" /> Offers &amp; review {ready.length > 0 && <span className="cs-tab-count">{ready.length}</span>}</button>
        <button aria-current={tab === "creators" ? "page" : undefined} onClick={() => setTab("creators")}><Search size={17} aria-hidden="true" /> Find creators</button>
        <button aria-current={tab === "team" ? "page" : undefined} onClick={() => setTab("team")}><Users size={17} aria-hidden="true" /> Team</button>
      </nav>
      {tab === "campaigns" && <Campaigns path={path} campaigns={data.campaigns} api={api} perform={perform} busy={busy} />}
      {tab === "offers" && <OfferList offers={data.offers} persona="brand" api={api} perform={perform} busy={busy} filter={offerFilter} setFilter={setOfferFilter} />}
      {tab === "creators" && <Directory path={path} open={open} api={api} perform={perform} busy={busy} />}
      {tab === "team" && <Team path={path} data={data} api={api} perform={perform} busy={busy} />}
    </>
  );
}

function Campaigns({ path, campaigns, api, perform, busy }: {
  path: string; campaigns: Campaign[]; api: Api; perform: Perform; busy: boolean;
}) {
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const endpoint = path + "/campaigns" + (editing && editing !== "new" ? "/" + editing.id : "");
    const saved = await perform(() => api(endpoint, {
      method: editing === "new" ? "POST" : "PUT",
      body: { title: fields.get("title"), brief: fields.get("brief") },
    }), "Campaign draft saved.");
    if (saved) setEditing(null);
  }

  function change(id: string, status: "open" | "closed") {
    if (status === "closed" && !window.confirm("Close this campaign? It will no longer accept offers.")) return;
    void perform(() => api(path + "/campaigns/" + id + "/status", { method: "POST", body: { status } }), status === "open" ? "Campaign opened. You can send offers in Find creators." : "Campaign closed.");
  }

  const draft = editing !== "new" ? editing : null;
  return (
    <section className="cs-panel" id="campaigns-panel" tabIndex={-1}>
      <div className="cs-panel-heading">
        <div><h2>Campaigns</h2><p>Draft a brief and open it when you’re ready to invite creators.</p></div>
        <button className="cs-button cs-primary" disabled={busy} onClick={() => setEditing("new")}><Plus size={17} aria-hidden="true" /> New campaign</button>
      </div>
      {editing && (
        <form key={draft?.id ?? "new"} className="cs-stack cs-inline-form" onSubmit={(event) => void save(event)}>
          <h3>{draft ? "Edit campaign draft" : "New campaign draft"}</h3>
          <label>Campaign name<input name="title" defaultValue={draft?.title} minLength={3} maxLength={120} required /></label>
          <label>Brief<textarea name="brief" defaultValue={draft?.brief} minLength={20} maxLength={6000} rows={5} required placeholder="Describe the deliverable, audience and due date." /></label>
          <div className="cs-actions">
            <button className="cs-button cs-primary" disabled={busy}>Save draft</button>
            <button className="cs-button cs-secondary" disabled={busy} type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {campaigns.length ? (
        <div className="cs-records">
          {campaigns.map((campaign) => (
            <article className="cs-record" key={campaign.id}>
              <div className="cs-panel-heading"><div><small>{date.format(new Date(campaign.createdAt))}</small><h3>{campaign.title}</h3></div><span className={"cs-pill status-" + campaign.status}>{campaign.status}</span></div>
              <p className="cs-prewrap">{campaign.brief}</p>
              <div className="cs-actions">
                {campaign.status === "draft" && <><button className="cs-button cs-quiet" disabled={busy} onClick={() => setEditing(campaign)}>Edit draft</button><button className="cs-button cs-secondary" disabled={busy} onClick={() => change(campaign.id, "open")}>Open for offers</button></>}
                {campaign.status !== "closed" && <button className="cs-button cs-quiet" disabled={busy} onClick={() => change(campaign.id, "closed")}>Close campaign</button>}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="cs-empty"><ClipboardList size={25} aria-hidden="true" /><p>Campaigns will appear here after you create your first draft.</p></div>}
    </section>
  );
}

function amountFromInput(value: string) {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value);
  return match ? Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0")) : 0;
}

function Directory({ path, open, api, perform, busy }: { path: string; open: Campaign[]; api: Api; perform: Perform; busy: boolean }) {
  const [filter, setFilter] = useState({ query: "", offset: 0 });
  const [selected, setSelected] = useState<CreatorProfile | null>(null);
  const [formError, setFormError] = useState("");
  const [queryField, setQueryField] = useState("");
  const load = useCallback((signal: AbortSignal) => {
    const params = new URLSearchParams({ q: filter.query, offset: String(filter.offset) });
    return api<{ creators: CreatorProfile[]; hasMore: boolean }>(path + "/creators?" + params, { signal });
  }, [api, path, filter]);
  const { data, error } = useResource(load, 0);

  async function sendOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setFormError("");
    const fields = new FormData(event.currentTarget);
    const amountCents = amountFromInput(String(fields.get("amount")));
    if (amountCents < 1 || amountCents > 100_000_000) {
      setFormError("Enter a fee between $0.01 and $1,000,000 with up to two decimal places.");
      return;
    }
    const saved = await perform(() => api(path + "/campaigns/" + fields.get("campaignId") + "/offers", {
      method: "POST", body: { creatorId: selected.userId, amountCents, note: fields.get("note") },
    }), "Offer sent. Track the response in Campaigns.");
    if (saved) setSelected(null);
  }

  return (
    <section className="cs-panel" id="directory-panel" tabIndex={-1}>
      <div className="cs-panel-heading"><div><h2>Creator discovery</h2><p>Find creators who’ve made their profile discoverable.</p></div></div>
      {!open.length && <p className="cs-callout">Open a campaign before sending an offer.</p>}
      <form className="cs-search" onSubmit={(event) => {
        event.preventDefault();
        setSelected(null);
        setFilter({ query: queryField.trim(), offset: 0 });
      }}>
        <label>Search by name or specialty<input type="search" value={queryField} onChange={(event) => setQueryField(event.target.value)} maxLength={100} placeholder="e.g. Outdoor film" /></label>
        <button className="cs-button cs-secondary"><Search size={17} aria-hidden="true" /> Search</button>
      </form>
      {selected && (
        <form key={selected.userId} className="cs-stack cs-inline-form" onSubmit={(event) => void sendOffer(event)}>
          <h3>Offer for {selected.displayName}</h3>
          <div className="cs-form-grid">
            <label>Campaign<select name="campaignId" required><option value="">Select a campaign</option>{open.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}</select></label>
            <label>Proposed fee (USD)<input name="amount" inputMode="decimal" required maxLength={10} placeholder="850.00" /></label>
          </div>
          <label>Note to creator <small>Optional</small><textarea name="note" rows={3} maxLength={1200} /></label>
          <p>Payment is arranged outside CollabSphere.</p>
          <Feedback error>{formError}</Feedback>
          <div className="cs-actions"><button className="cs-button cs-primary" disabled={busy || !open.length}>Send offer</button><button className="cs-button cs-secondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
        </form>
      )}
      <Feedback error>{error}</Feedback>
      {data ? (
        <>
          {data.creators.length ? (
            <div className="cs-creator-grid">
              {data.creators.map((creator) => (
                <article className="cs-record" key={creator.userId}>
                  <div className="cs-creator-avatar" aria-hidden="true">{creator.displayName.slice(0, 1)}</div>
                  <h3>{creator.displayName}</h3>
                  <small>{creator.niche}</small>
                  <p className="cs-prewrap">{creator.bio}</p>
                  <div className="cs-actions">
                    {creator.portfolioUrl && <a href={creator.portfolioUrl} target="_blank" rel="noopener noreferrer" className="cs-link">Portfolio <ArrowUpRight size={15} aria-hidden="true" /></a>}
                    <button className="cs-button cs-secondary" disabled={busy || !open.length} onClick={() => { setSelected(creator); setFormError(""); }}>Prepare offer</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="cs-empty"><Search size={22} aria-hidden="true" /><p>No listed creators match this search.</p></div>}
          {(filter.offset > 0 || data.hasMore) && <div className="cs-actions"><button className="cs-button cs-secondary" disabled={!filter.offset} onClick={() => setFilter({ ...filter, offset: Math.max(0, filter.offset - 20) })}>Previous</button><button className="cs-button cs-secondary" disabled={!data.hasMore} onClick={() => setFilter({ ...filter, offset: filter.offset + 20 })}>Next</button></div>}
        </>
      ) : !error && <p role="status">Searching creators…</p>}
    </section>
  );
}

function Team({ path, data, api, perform, busy }: { path: string; data: BrandWorkspace; api: Api; perform: Perform; busy: boolean }) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const canInvite = data.workspace.role === "owner";

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(async () => {
      const result = await api<{ token: string }>(path + "/invites", { method: "POST", body: { email: fields.get("email") } });
      const link = new URL("/", location.origin);
      link.hash = "invite=" + result.token;
      setInviteUrl(link.href);
      setCopyStatus("");
    }, "Invitation created. Share the link with your teammate.");
    if (saved) form.reset();
  }

  return (
    <>
      <section className="cs-panel">
        <div className="cs-panel-heading"><div><h2>Team access</h2><p>Editors can manage campaigns and review deliverables. Owners manage team access.</p></div><span className="cs-pill">{data.members.length} {data.members.length === 1 ? "member" : "members"}</span></div>
        {canInvite && (
          <>
            <form className="cs-search cs-inline-form" onSubmit={(event) => void invite(event)}>
              <label>Teammate email<input name="email" type="email" required maxLength={254} placeholder="name@company.com" /></label>
              <button className="cs-button cs-primary" disabled={busy}>Create invite link</button>
            </form>
            {inviteUrl && <div className="cs-stack cs-inline-form">
              <label>Invitation link<input readOnly value={inviteUrl} onFocus={(event) => event.target.select()} /></label>
              <p>Share this link with the invited teammate. It expires in seven days.</p>
              <div className="cs-actions">
                <button className="cs-button cs-secondary" onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => setCopyStatus("Copied to clipboard."), () => setCopyStatus("Select the link to copy it manually."))}><Copy size={17} aria-hidden="true" /> Copy link</button>
                <Feedback>{copyStatus}</Feedback>
              </div>
            </div>}
          </>
        )}
        <ul className="cs-team-list">
          {data.members.map((member) => <li key={member.userId}>
            <div><strong>{member.email}</strong><small>{member.role}</small></div>
            {canInvite && member.role === "editor" && <button className="cs-button cs-quiet" disabled={busy} onClick={() => {
              if (window.confirm("Remove this teammate’s workspace access?")) void perform(() => api(path + "/members/" + encodeURIComponent(member.userId), { method: "DELETE" }), "Teammate removed.");
            }}>Remove access</button>}
          </li>)}
        </ul>
        {data.pendingInvites.length > 0 && <>
          <h3>Pending invitations</h3>
          <ul className="cs-team-list">
            {data.pendingInvites.map((record) => <li key={record.id}><div><strong>{record.email}</strong><small>Expires {date.format(new Date(record.expiresAt))}</small></div><button className="cs-button cs-quiet" disabled={busy} onClick={() => void perform(() => api(path + "/invites/" + record.id, { method: "DELETE" }), "Invitation revoked.")}>Revoke</button></li>)}
          </ul>
        </>}
      </section>
      <section className="cs-panel">
        <div className="cs-panel-heading"><div><h2>Recent activity</h2><p>Track the latest changes in this workspace.</p></div></div>
        <ul className="cs-team-list">{data.activity.map((entry) => <li key={entry.id}><div><strong>{entry.kind}</strong><small>{entry.detail}</small></div><time dateTime={entry.createdAt}>{date.format(new Date(entry.createdAt))}</time></li>)}</ul>
      </section>
    </>
  );
}
