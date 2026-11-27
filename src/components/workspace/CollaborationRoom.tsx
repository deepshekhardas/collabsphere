import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, FileText, Link2, MessageSquareText } from "lucide-react";
import type { Deliverable, Offer, OfferStatus } from "@/types/workspace";
import type { Api, OperationFeedback, Perform } from "./api-client";
import { date, fee, offerStatusLabel, type OfferPersona } from "./offer-display";
import { Feedback, focusSection } from "./ui";

const phase: Record<OfferStatus, number> = {
  sent: 0,
  accepted: 1,
  declined: 0,
  withdrawn: 0,
  submitted: 2,
  changes_requested: 2,
  approved: 3,
};

function Progress({ status }: { status: OfferStatus }) {
  if (status === "declined" || status === "withdrawn") return null;
  const at = phase[status];
  const steps = ["Offer", "Production", "Review", "Approved"];
  return (
    <ol className="cs-room-progress" aria-label="Collaboration progress">
      {steps.map((step, index) => (
        <li key={step} className={index < at ? "is-complete" : index === at ? "is-current" : undefined} aria-current={index === at ? "step" : undefined}>
          <span className="cs-room-progress-mark" aria-hidden="true">{index < at && <Check size={13} strokeWidth={3} />}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function describeAction(offer: Offer, asCreator: boolean) {
  const revision = offer.deliverables[0];
  switch (offer.status) {
    case "sent":
      return asCreator
        ? { title: "Respond to this offer", detail: "Check the brief and proposed fee before accepting." }
        : { title: "Waiting for a response", detail: "The creator can accept or decline the offer from their workspace." };
    case "accepted":
      return asCreator
        ? { title: "Submit your deliverable", detail: "Add a link the brand can open and any notes for the review." }
        : { title: "The creator is working on the brief", detail: "Their first submission will appear here when it is ready for review." };
    case "submitted":
      if (asCreator) return { title: "Waiting for brand review", detail: "The brand can approve this version or send feedback for another revision." };
      if (offer.viewerIsCreator) return { title: "Another team member needs to review", detail: "This is your deliverable. A different brand team member can review it here." };
      return { title: revision ? "Review revision " + revision.revision : "Review the deliverable", detail: "Open the submitted work and review it against the campaign brief." };
    case "changes_requested":
      return asCreator
        ? { title: "Submit the next revision", detail: "Review the brand feedback below and add an updated link." }
        : { title: "Waiting for the next revision", detail: "The creator can respond to the feedback with an updated deliverable." };
    case "approved":
      return { title: "Deliverable approved", detail: "The approved revision and earlier feedback are available in this room." };
    case "declined":
      return { title: "Offer declined", detail: "This collaboration ended before production started." };
    case "withdrawn":
      return { title: "Offer withdrawn", detail: "The brand withdrew the offer before it was accepted." };
  }
}

function LatestRevision({ revision }: { revision: Deliverable }) {
  return (
    <div className="cs-room-latest">
      <span className="cs-process-icon"><Link2 size={19} aria-hidden="true" /></span>
      <div className="cs-room-latest-text">
        <strong>Revision {revision.revision}</strong>
        <p>Submitted <time dateTime={revision.createdAt}>{date.format(new Date(revision.createdAt))}</time></p>
      </div>
      <a className="cs-button cs-secondary" href={revision.url} target="_blank" rel="noopener noreferrer">
        Open revision {revision.revision} <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

function RevisionHistory({ deliverables }: { deliverables: Deliverable[] }) {
  return (
    <section className="cs-room-section">
      <header className="cs-room-section-heading">
        <div className="cs-room-icon-heading"><MessageSquareText size={18} aria-hidden="true" /><h4>Revision history</h4></div>
        <span>{deliverables.length} {deliverables.length === 1 ? "version" : "versions"}</span>
      </header>
      {deliverables.length > 0 ? (
        <ol className="cs-room-history">
          {deliverables.map((entry, index) => (
            <li key={entry.revision}>
              <div className="cs-room-history-heading">
                <div>
                  <strong>Revision {entry.revision}</strong>
                  <time dateTime={entry.createdAt}>{date.format(new Date(entry.createdAt))}</time>
                </div>
                <span className={"cs-pill status-" + (entry.review ?? "submitted")}>{offerStatusLabel[entry.review ?? "submitted"]}</span>
              </div>
              {entry.note && <p className="cs-room-history-note cs-prewrap">{entry.note}</p>}
              {entry.feedback && <blockquote><strong>Brand feedback</strong><p className="cs-prewrap">{entry.feedback}</p></blockquote>}
              {index > 0 && (
                <a className="cs-link" href={entry.url} target="_blank" rel="noopener noreferrer">
                  Open revision {entry.revision} <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ol>
      ) : <p className="cs-room-empty">The first submission will start the revision history.</p>}
    </section>
  );
}

function Brief({ offer }: { offer: Offer }) {
  return (
    <section className="cs-room-section cs-room-brief" id="offer-room-brief" tabIndex={-1}>
      <div className="cs-room-icon-heading"><FileText size={18} aria-hidden="true" /><h4>Campaign brief</h4></div>
      <p className="cs-prewrap">{offer.brief}</p>
      {offer.note && <div className="cs-room-offer-note"><strong>Offer note</strong><p className="cs-prewrap">{offer.note}</p></div>}
    </section>
  );
}

export function CollaborationRoom({ offer, persona, api, perform, busy, onBack }: {
  offer: Offer; persona: OfferPersona; api: Api; perform: Perform; busy: boolean; onBack: () => void;
}) {
  const [notice, setNotice] = useState<OperationFeedback | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const asCreator = persona === "creator";
  const offerPath = "/offers/" + offer.id;
  const latest = offer.deliverables[0];
  const action = describeAction(offer, asCreator);
  useEffect(() => {
    if (notice && !notice.error) noticeRef.current?.focus();
  }, [notice]);

  function respond(response: "accept" | "decline" | "withdraw", message: string) {
    void perform(() => api(offerPath + "/response", { method: "POST", body: { action: response } }), message, setNotice);
  }

  async function submitDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(() => api(offerPath + "/deliverables", {
      method: "POST", body: { url: fields.get("url"), note: fields.get("note") },
    }), "Deliverable submitted for review.", setNotice);
    if (saved) form.reset();
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!latest) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (!(submitter instanceof HTMLButtonElement)) return;
    const decision = submitter.value === "approved" ? "approved" : "changes_requested";
    if (decision === "changes_requested" && !String(fields.get("feedback") ?? "").trim()) {
      setNotice({ message: "Enter feedback so the creator knows what to revise.", error: true });
      form.querySelector("textarea")?.focus();
      return;
    }
    const saved = await perform(() => api(offerPath + "/review", {
      method: "POST", body: { revision: latest.revision, feedback: fields.get("feedback"), decision },
    }), decision === "approved" ? "Deliverable approved." : "Revision feedback sent.", setNotice);
    if (saved) form.reset();
  }

  const canRespond = offer.status === "sent" && (asCreator || !offer.viewerIsCreator);
  const canSubmit = asCreator && (offer.status === "accepted" || offer.status === "changes_requested");
  const canReview = !asCreator && offer.status === "submitted" && latest && !offer.viewerIsCreator;

  return (
    <article className="cs-collaboration-room" aria-labelledby="offer-room-heading">
      <header className="cs-room-header">
        <button type="button" className="cs-button cs-room-back" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Back to offers</button>
        <div className="cs-room-title">
          <div><p>{asCreator ? offer.workspaceName : offer.creatorName}</p><h3 id="offer-room-heading" tabIndex={-1}>{offer.campaignTitle}</h3></div>
          <span className={"cs-pill status-" + offer.status}>{offerStatusLabel[offer.status]}</span>
        </div>
        <dl className="cs-room-meta">
          <div><dt>Proposed fee</dt><dd>{fee.format(offer.amountCents / 100)} USD</dd></div>
          <div><dt>Offered on</dt><dd><time dateTime={offer.createdAt}>{date.format(new Date(offer.createdAt))}</time></dd></div>
        </dl>
        <Progress status={offer.status} />
      </header>
      <div className="cs-room-body">
        <section className="cs-room-section cs-room-action">
          <div className="cs-room-action-intro">
            <div><h4>{action.title}</h4><p>{action.detail}</p></div>
            {(canReview || (canRespond && asCreator)) && (
              <button type="button" className="cs-button cs-quiet" onClick={() => focusSection("offer-room-brief")}>View campaign brief</button>
            )}
          </div>
          {latest && <LatestRevision revision={latest} />}
          {canSubmit && latest?.feedback && <blockquote className="cs-room-current-feedback"><strong>Brand feedback on revision {latest.revision}</strong><p className="cs-prewrap">{latest.feedback}</p></blockquote>}
          {notice && <div className="cs-room-notice" ref={noticeRef} tabIndex={-1}><Feedback error={notice.error}>{notice.message}</Feedback></div>}
          {canRespond && (
            <div className="cs-actions cs-room-actions">
              {asCreator ? (
                <>
                  <button className="cs-button cs-primary" disabled={busy} onClick={() => respond("accept", "Offer accepted.")}>Accept offer</button>
                  <button className="cs-button cs-secondary" disabled={busy} onClick={() => respond("decline", "Offer declined.")}>Decline offer</button>
                </>
              ) : <button className="cs-button cs-secondary" disabled={busy} onClick={() => respond("withdraw", "Offer withdrawn.")}>Withdraw offer</button>}
            </div>
          )}
          {canSubmit && (
            <form className="cs-stack" onSubmit={(event) => void submitDeliverable(event)} aria-busy={busy}>
              <label>Deliverable link<input type="url" name="url" maxLength={2048} required placeholder="https://…" /></label>
              <label>Notes <small>Optional</small><textarea name="note" rows={3} maxLength={3000} /></label>
              <button className="cs-button cs-primary" disabled={busy}>{offer.status === "changes_requested" ? "Submit next revision" : "Submit deliverable"}</button>
            </form>
          )}
          {canReview && (
            <form className="cs-stack" onSubmit={(event) => void review(event)} aria-busy={busy}>
              <label>Feedback <small>Required when requesting changes</small><textarea name="feedback" rows={3} maxLength={3000} /></label>
              <div className="cs-actions">
                <button className="cs-button cs-primary" type="submit" value="approved" disabled={busy}>Approve revision {latest.revision}</button>
                <button className="cs-button cs-secondary" type="submit" value="changes_requested" disabled={busy}>Request changes</button>
              </div>
            </form>
          )}
        </section>
        <Brief offer={offer} />
        <RevisionHistory deliverables={offer.deliverables} />
      </div>
    </article>
  );
}
