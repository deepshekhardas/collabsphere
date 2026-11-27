import type { FormEvent } from "react";
import { ArrowUpRight, ClipboardList, Film } from "lucide-react";
import type { Offer, OfferStatus } from "@/types/workspace";
import type { Api, Perform } from "./api-client";

const labels: Record<OfferStatus, string> = {
  sent: "Awaiting response",
  accepted: "In progress",
  declined: "Declined",
  withdrawn: "Withdrawn",
  submitted: "Awaiting review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

export const fee = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export type OfferFilter = "all" | "action" | "working" | "closed";
const completed = new Set<OfferStatus>(["approved", "declined", "withdrawn"]);

export function needsOfferAction(status: OfferStatus, persona: "creator" | "brand") {
  return persona === "brand" ? status === "submitted" : ["sent", "accepted", "changes_requested"].includes(status);
}

export function OfferList({ offers, persona, api, perform, busy, filter: selected, setFilter }: {
  offers: Offer[]; persona: "creator" | "brand"; api: Api; perform: Perform; busy: boolean;
  filter: OfferFilter; setFilter: (filter: OfferFilter) => void;
}) {
  const asCreator = persona === "creator";
  const closed = offers.filter((offer) => completed.has(offer.status));
  const actionable = offers.filter((offer) => needsOfferAction(offer.status, persona));
  const working = offers.filter((offer) => !completed.has(offer.status) && !needsOfferAction(offer.status, persona));
  const filters: { key: OfferFilter; label: string; items: Offer[] }[] = [
    { key: "all", label: "All offers", items: [...actionable, ...working, ...closed] },
    { key: "action", label: asCreator ? "Needs your action" : "Needs review", items: actionable },
    { key: "working", label: "In progress", items: working },
    { key: "closed", label: "Closed", items: closed },
  ];
  const visible = filters.find((filter) => filter.key === selected)!.items;
  return (
    <section className="cs-panel" id="offer-list" tabIndex={-1}>
      <div className="cs-panel-heading">
        <div><h2>{asCreator ? "Your collaborations" : "Offers and deliverable review"}</h2>
        <p>{asCreator ? "Respond to offers, submit your work and follow feedback." : "Track offers and review the latest revision once a creator submits it."}</p></div>
      </div>
      {offers.length > 0 && <div className="cs-filter-group" role="group" aria-label="Filter offers">
        {filters.map((filter) => <button aria-pressed={filter.key === selected} key={filter.key} onClick={() => setFilter(filter.key)}>{filter.label} <span>{filter.items.length}</span></button>)}
      </div>}
      <p className="cs-sr-only" role="status">{visible.length} {visible.length === 1 ? "offer" : "offers"} shown</p>
      {offers.length ? (
        visible.length ? <div className="cs-records">
          {visible.map((offer) => <OfferCard key={offer.id} offer={offer} asCreator={asCreator} api={api} perform={perform} busy={busy} />)}
        </div> : <div className="cs-empty"><ClipboardList size={25} aria-hidden="true" /><p>No offers match this view.</p></div>
      ) : (
        <div className="cs-empty"><ClipboardList size={25} aria-hidden="true" /><p>{asCreator ? "Offers from brands will appear here." : "Open a campaign and find a creator to send your first offer."}</p></div>
      )}
    </section>
  );
}

function OfferCard({ offer, asCreator, api, perform, busy }: {
  offer: Offer; asCreator: boolean; api: Api; perform: Perform; busy: boolean;
}) {
  const offerPath = "/offers/" + offer.id;
  const latest = offer.deliverables[0];
  function response(action: "accept" | "decline" | "withdraw", message: string) {
    void perform(() => api(offerPath + "/response", { method: "POST", body: { action } }), message);
  }

  async function submitDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(() => api(offerPath + "/deliverables", {
      method: "POST", body: { url: fields.get("url"), note: fields.get("note") },
    }), "Deliverable submitted for review.");
    if (saved) form.reset();
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "approved" ? "approved" : "changes_requested";
    const saved = await perform(() => api(offerPath + "/review", {
      method: "POST", body: { revision: latest.revision, feedback: fields.get("feedback"), decision },
    }), decision === "approved" ? "Deliverable approved." : "Revision feedback sent.");
    if (saved) form.reset();
  }

  return (
    <article className={"cs-record cs-offer-record" + (needsOfferAction(offer.status, asCreator ? "creator" : "brand") ? " is-actionable" : "")}>
      <div className="cs-panel-heading">
        <div><small>{asCreator ? offer.workspaceName : offer.creatorName}</small><h3>{offer.campaignTitle}</h3></div>
        <span className={"cs-pill status-" + offer.status}>{labels[offer.status]}</span>
      </div>
      <p className="cs-offer-fee"><strong>{fee.format(offer.amountCents / 100)}</strong> proposed fee · {date.format(new Date(offer.createdAt))}</p>
      {offer.note && <p className="cs-prewrap">{offer.note}</p>}
      {asCreator && <details className="cs-details"><summary>Campaign brief</summary><p className="cs-prewrap">{offer.brief}</p></details>}
      {latest && offer.status === "submitted" && !asCreator && (
        <div className="cs-review-preview">
          <div className="cs-process-icon"><Film size={20} aria-hidden="true" /></div>
          <div><strong>Revision {latest.revision}</strong><p>Submitted {date.format(new Date(latest.createdAt))}</p></div>
          <a className="cs-button cs-secondary" href={latest.url} target="_blank" rel="noopener noreferrer">Open deliverable <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>
      )}
      {offer.deliverables.length > 0 && (
        <details className="cs-details" open={offer.status === "changes_requested"}>
          <summary>Deliverable history ({offer.deliverables.length})</summary>
          <ul className="cs-revisions">
            {offer.deliverables.map((entry) => (
              <li key={entry.revision}>
                <div className="cs-panel-heading">
                  <a className="cs-link" href={entry.url} target="_blank" rel="noopener noreferrer">Open revision {entry.revision} <ArrowUpRight size={15} aria-hidden="true" /></a>
                  <small>{date.format(new Date(entry.createdAt))}</small>
                </div>
                {entry.note && <p className="cs-prewrap">{entry.note}</p>}
                {entry.review && <p><strong>{entry.review === "approved" ? "Approved" : "Changes requested"}</strong>{entry.feedback && <> · {entry.feedback}</>}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {offer.status === "sent" && (
        <div className="cs-actions">
          {asCreator ? (
            <>
              <button className="cs-button cs-primary" disabled={busy} onClick={() => response("accept", "Offer accepted.")}>Accept offer</button>
              <button className="cs-button cs-secondary" disabled={busy} onClick={() => response("decline", "Offer declined.")}>Decline offer</button>
            </>
          ) : <button className="cs-button cs-secondary" disabled={busy} onClick={() => response("withdraw", "Offer withdrawn.")}>Withdraw offer</button>}
        </div>
      )}
      {asCreator && (offer.status === "accepted" || offer.status === "changes_requested") && (
        <form className="cs-stack cs-inline-form" onSubmit={(event) => void submitDeliverable(event)}>
          <label>Deliverable link<input type="url" name="url" maxLength={2048} required placeholder="https://…" /></label>
          <label>Notes <small>Optional</small><textarea name="note" rows={2} maxLength={3000} /></label>
          <button className="cs-button cs-primary" disabled={busy}>{offer.status === "changes_requested" ? "Submit next revision" : "Submit deliverable"}</button>
        </form>
      )}
      {!asCreator && offer.status === "submitted" && latest && (
        <form className="cs-stack cs-inline-form" onSubmit={(event) => void review(event)}>
          <label>Feedback <small>Required for changes</small><textarea name="feedback" rows={3} maxLength={3000} /></label>
          <div className="cs-actions">
            <button className="cs-button cs-primary" value="approved" disabled={busy}>Approve revision {latest.revision}</button>
            <button className="cs-button cs-secondary" value="changes_requested" disabled={busy}>Request changes</button>
          </div>
        </form>
      )}
    </article>
  );
}
