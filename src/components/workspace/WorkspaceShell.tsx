import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { ArrowRight, ArrowUpRight, Building2, CircleUserRound, Compass, LogOut, Menu, Plus, RefreshCw, X } from "lucide-react";
import type { AccountWorkspace, CreatorProfile } from "@/types/workspace";
import { BrandRoom } from "./BrandRoom";
import { needsOfferAction, OfferList, type OfferFilter } from "./OfferList";
import { Brand, Feedback, FocusCard, LoadingWorkspace, focusSection } from "./ui";
import { accountApi, useResource, type Api, type Perform } from "./api-client";

type View = "overview" | "creator" | { workspaceId: string };

function CreatorProfileForm({ creator, api, perform, busy }: {
  creator: CreatorProfile | null; api: Api; perform: Perform; busy: boolean;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const body = {
      displayName: fields.get("displayName"),
      niche: fields.get("niche"),
      bio: fields.get("bio"),
      portfolioUrl: fields.get("portfolioUrl"),
      published: fields.get("published") === "on",
    };
    void perform(() => api("/creator-profile", { method: "POST", body }), body.published ? "Your profile is listed in discovery." : "Your profile is saved privately.");
  }

  return (
    <section className="cs-panel" id="discovery-profile" tabIndex={-1}>
      <div className="cs-panel-heading"><h2>Discovery profile</h2><span className="cs-pill">{creator?.published ? "Listed" : "Private"}</span></div>
      <p>Share only information you’re comfortable showing to signed-in brands. Your account email is private.</p>
      <form onSubmit={submit} className="cs-stack">
        <div className="cs-form-grid">
          <label>Display name<input name="displayName" defaultValue={creator?.displayName} required minLength={2} maxLength={100} /></label>
          <label>Specialty<input name="niche" defaultValue={creator?.niche} required minLength={2} maxLength={100} placeholder="e.g. Outdoor filmmaking" /></label>
        </div>
        <label>About your work<textarea name="bio" defaultValue={creator?.bio} required minLength={10} maxLength={1200} rows={4} /></label>
        <label>Portfolio URL <small>Optional</small><input type="url" name="portfolioUrl" maxLength={2048} defaultValue={creator?.portfolioUrl} placeholder="https://…" /></label>
        <label className="cs-check"><input type="checkbox" name="published" defaultChecked={creator?.published} /> Include my profile in creator discovery</label>
        <button className="cs-button cs-primary" disabled={busy}>Save profile</button>
      </form>
    </section>
  );
}

function Overview({ data, create, openCreator, openBrand, busy }: {
  data: AccountWorkspace; create: (name: string) => void; openCreator: () => void; openBrand: (id: string) => void; busy: boolean;
}) {
  return (
    <>
      <header className="cs-page-heading"><p className="cs-eyebrow">Your account</p><h1>Workspace overview</h1><p>Manage brand campaigns and your own creator profile from the same account.</p></header>
      {data.workspaces.length > 0 && <section className="cs-panel">
        <div className="cs-panel-heading"><h2>Your brand workspaces</h2></div>
        <div className="cs-workspace-list">
          {data.workspaces.map((workspace) => (
            <button key={workspace.id} onClick={() => openBrand(workspace.id)}>
              <span className="cs-process-icon"><Building2 size={17} aria-hidden="true" /></span>
              <span><strong>{workspace.name}</strong><small>{workspace.role}</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>}
      <div className="cs-overview-grid">
        <section className="cs-panel">
          <div className="cs-process-icon"><Building2 size={19} /></div>
          <h2>Brand workspace</h2>
          <p>Set up a team, prepare a brief and invite a creator to collaborate.</p>
          <form className="cs-stack" onSubmit={(event) => {
            event.preventDefault();
            create(String(new FormData(event.currentTarget).get("name")));
          }}>
            <label>Workspace name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Northfield Studio" /></label>
            <button className="cs-button cs-primary" disabled={busy}><Plus size={17} aria-hidden="true" /> Create workspace</button>
          </form>
        </section>
        <section className="cs-panel">
          <div className="cs-process-icon"><CircleUserRound size={21} /></div>
          <h2>Creator workspace</h2>
          <p>{data.creator ? "Update how brands find you and manage your collaboration offers." : "Build a discovery profile and manage brand offers when they arrive."}</p>
          <button className="cs-button cs-secondary" onClick={openCreator}>Open creator workspace <ArrowUpRight size={17} aria-hidden="true" /></button>
        </section>
      </div>
    </>
  );
}

export function WorkspaceShell({ user, signOut }: { user: User; signOut: () => Promise<void> }) {
  const api = useMemo(() => accountApi(user), [user]);
  const [view, setView] = useState<View>("overview");
  const [creatorFilter, setCreatorFilter] = useState<OfferFilter>("all");
  const [revision, setRevision] = useState(0);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get("invite");
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  });
  const pending = useRef(false);
  const loadAccount = useCallback((signal: AbortSignal) => api<AccountWorkspace>("/account", { signal }), [api]);
  const account = useResource(loadAccount, revision);
  const selected = typeof view === "object" ? account.data?.workspaces.find((workspace) => workspace.id === view.workspaceId) : null;
  const creatorNext = account.data?.offers.find((offer) => needsOfferAction(offer.status, "creator"));

  function navigate(next: View) {
    setView(next);
    setMenu(false);
    setStatus("");
    setError("");
  }

  const perform: Perform = async (action, message) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
      setRevision((value) => value + 1);
      setStatus(message);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't complete that action.");
      return false;
    } finally {
      setBusy(false);
      pending.current = false;
    }
  };

  function dismissInvite() {
    setInvite(null);
    history.replaceState(history.state, "", location.pathname + location.search);
  }

  return (
    <div className="cs-app cs-shell">
      <a className="cs-skip" href="#main-content">Skip to content</a>
      <header className="cs-topbar">
        <Brand />
        <button className="cs-button cs-secondary cs-menu" onClick={() => setMenu(!menu)} aria-controls="workspace-menu" aria-expanded={menu}>
          {menu ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />} Menu
        </button>
        <div className="cs-topbar-account"><span className="cs-account-avatar" aria-hidden="true">{user.email?.slice(0, 1).toUpperCase()}</span><span>{user.email}</span><button className="cs-button cs-quiet" disabled={busy} onClick={() => void perform(signOut, "")}><LogOut size={17} aria-hidden="true" /> Sign out</button></div>
      </header>
      <aside className={"cs-sidebar" + (menu ? " is-open" : "")} id="workspace-menu">
        <nav aria-label="Workspaces">
          <button aria-current={view === "overview" ? "page" : undefined} onClick={() => navigate("overview")}><Compass size={18} aria-hidden="true" /> Overview</button>
          <button aria-current={view === "creator" ? "page" : undefined} onClick={() => navigate("creator")}><CircleUserRound size={18} aria-hidden="true" /> Creator workspace</button>
          <p>Brand workspaces</p>
          {account.data?.workspaces.map((workspace) => (
            <button key={workspace.id} aria-current={selected?.id === workspace.id ? "page" : undefined} onClick={() => navigate({ workspaceId: workspace.id })}>
              <Building2 size={18} aria-hidden="true" /> <span>{workspace.name}</span>
            </button>
          ))}
          <button onClick={() => navigate("overview")}><Plus size={18} aria-hidden="true" /> Create workspace</button>
          <button className="cs-sidebar-logout" disabled={busy} onClick={() => void perform(signOut, "")}><LogOut size={18} aria-hidden="true" /> Sign out</button>
        </nav>
      </aside>
      <main className="cs-main" id="main-content">
        {invite && (
          <section className="cs-panel cs-invite-banner">
            <div><h2>Workspace invitation</h2><p>Accept with the verified email the owner invited.</p></div>
            <div className="cs-actions">
              <button className="cs-button cs-primary" disabled={busy} onClick={() => void perform(async () => {
                const joined = await api<{ id: string }>("/invites/accept", { method: "POST", body: { token: invite } });
                dismissInvite();
                setView({ workspaceId: joined.id });
              }, "You joined the workspace.")}>Accept invitation</button>
              <button className="cs-button cs-quiet" disabled={busy} onClick={dismissInvite}>Dismiss</button>
            </div>
          </section>
        )}
        <Feedback error>{error || account.error}</Feedback>
        <Feedback>{status}</Feedback>
        {!account.data ? (
          account.error ? <button className="cs-button cs-secondary" onClick={() => setRevision((value) => value + 1)}>Retry loading</button> : <LoadingWorkspace label="Loading your workspace" />
        ) : view === "overview" ? (
          <Overview data={account.data} busy={busy} openCreator={() => navigate("creator")} openBrand={(workspaceId) => navigate({ workspaceId })} create={(name) => void perform(async () => {
            const added = await api<{ id: string }>("/workspaces", { method: "POST", body: { name } });
            setView({ workspaceId: added.id });
          }, "Brand workspace created.")} />
        ) : view === "creator" ? (
          <>
            <header className="cs-page-heading cs-brand-heading">
              <div><p className="cs-eyebrow">Your account</p><h1>Creator workspace</h1><p>Manage the profile brands see and deliver the work you’ve agreed to.</p></div>
              <button className="cs-button cs-secondary" disabled={busy} onClick={() => setRevision((value) => value + 1)}>
                <RefreshCw size={16} aria-hidden="true" /> Refresh
              </button>
            </header>
            <FocusCard tone="creator" label="Next for the creator"
              title={creatorNext?.status === "sent" ? "An offer is waiting." : creatorNext?.status === "changes_requested" ? "Your next revision is due." : creatorNext ? "Your deliverable is next." : account.data.creator?.published ? "Your profile is discoverable." : "Help brands find your work."}
              action={<button className="cs-button cs-inverse" onClick={() => {
                if (creatorNext) setCreatorFilter("action");
                focusSection(creatorNext ? "offer-list" : "discovery-profile");
              }}>
                {creatorNext ? "View collaborations" : "Edit profile"} <ArrowRight size={17} aria-hidden="true" />
              </button>}>
              {creatorNext ? creatorNext.campaignTitle + " · " + creatorNext.workspaceName
                : account.data.creator?.published ? "Keep your profile and portfolio current while you wait for an offer." : "Publish a profile with your specialty and a link to your work."}
            </FocusCard>
            <OfferList offers={account.data.offers} persona="creator" api={api} perform={perform} busy={busy} filter={creatorFilter} setFilter={setCreatorFilter} />
            <CreatorProfileForm creator={account.data.creator} api={api} perform={perform} busy={busy} />
          </>
        ) : (
          <BrandRoom key={view.workspaceId} workspaceId={view.workspaceId} api={api} perform={perform} busy={busy} revision={revision} />
        )}
      </main>
    </div>
  );
}
