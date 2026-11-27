import type { FormEvent } from "react";
import { ArrowUpRight, ClipboardList } from "lucide-react";
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

export function OfferList({ offers, persona, api, perform, busy }: {
  offers: Offer[]; persona: "creator" | "brand"; api: Api; perform: Perform; busy: boolean;
}) {
  const asCreator = persona === "creator";
  return (
    <section className="cs-panel">
      <div className="cs-panel-heading">
        <h2>{asCreator ? "Incoming offers" : "Collaboration offers"}</h2>
        <span className="cs-pill">{offers.length}</span>
      </div>
      {offers.length ? (
        <div className="cs-records">
          {offers.map((offer) => <OfferCard key={offer.id} offer={offer} asCreator={asCreator} api={api} perform={perform} busy={busy} />)}
        </div>
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
    <article className="cs-record">
      <div className="cs-panel-heading">
        <div><small>{asCreator ? offer.workspaceName : offer.creatorName}</small><h3>{offer.campaignTitle}</h3></div>
        <span className={"cs-pill status-" + offer.status}>{labels[offer.status]}</span>
      </div>
      <p className="cs-offer-fee"><strong>{fee.format(offer.amountCents / 100)}</strong> proposed fee · {date.format(new Date(offer.createdAt))}</p>
      {offer.note && <p className="cs-prewrap">{offer.note}</p>}
      {asCreator && <details className="cs-details"><summary>Campaign brief</summary><p className="cs-prewrap">{offer.brief}</p></details>}
      {offer.deliverables.length > 0 && (
        <details className="cs-details" open={offer.status === "submitted" || offer.status === "changes_requested"}>
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
