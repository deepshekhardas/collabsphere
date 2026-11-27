import { ArrowRight, ClipboardList, Layers3, MessageSquareText } from "lucide-react";
import type { Offer, OfferStatus } from "@/types/workspace";
import type { Api, Perform } from "./api-client";
import { CollaborationRoom } from "./CollaborationRoom";
import { date, offerStatusLabel, type OfferPersona } from "./offer-display";
import { focusSection } from "./ui";

export { date } from "./offer-display";
export type OfferFilter = "all" | "action" | "working" | "closed";
const completed = new Set<OfferStatus>(["approved", "declined", "withdrawn"]);

export function needsOfferAction(offer: Offer, persona: OfferPersona) {
  return persona === "brand"
    ? offer.status === "submitted" && !offer.viewerIsCreator
    : ["sent", "accepted", "changes_requested"].includes(offer.status);
}

export function OfferList({ offers, persona, api, perform, busy, filter, setFilter, openOfferId, setOpenOfferId }: {
  offers: Offer[];
  persona: OfferPersona;
  api: Api;
  perform: Perform;
  busy: boolean;
  filter: OfferFilter;
  setFilter: (filter: OfferFilter) => void;
  openOfferId: string | null;
  setOpenOfferId: (id: string | null) => void;
}) {
  const asCreator = persona === "creator";
  const closed = offers.filter((offer) => completed.has(offer.status));
  const actionable = offers.filter((offer) => needsOfferAction(offer, persona));
  const working = offers.filter((offer) => !completed.has(offer.status) && !needsOfferAction(offer, persona));
  const groups: Record<OfferFilter, { label: string; offers: Offer[] }> = {
    all: { label: "All offers", offers: [...actionable, ...working, ...closed] },
    action: { label: asCreator ? "Needs your action" : "Needs review", offers: actionable },
    working: { label: "In progress", offers: working },
    closed: { label: "Closed", offers: closed },
  };
  const visible = groups[filter].offers;
  const selected = offers.find((offer) => offer.id === openOfferId);

  function showRoom(id: string) {
    setOpenOfferId(id);
    focusSection("offer-room-heading");
  }

  function showQueue() {
    setOpenOfferId(null);
    focusSection(visible.some((offer) => offer.id === openOfferId) ? "offer-row-" + openOfferId : "offer-list");
  }

  return (
    <section className={"cs-panel cs-collaborations" + (selected ? " has-open-room" : "")} id="offer-list" tabIndex={-1} aria-labelledby="offer-list-title">
      <div className="cs-offer-intro cs-panel-heading">
        <div>
          <h2 id="offer-list-title">{asCreator ? "Your collaborations" : "Offers and deliverable review"}</h2>
          <p>{asCreator ? "Respond to offers, submit work and follow feedback." : "Track offers and review the latest revision from each creator."}</p>
        </div>
        <span className="cs-offer-count"><Layers3 size={16} aria-hidden="true" /> {offers.length} {offers.length === 1 ? "collaboration" : "collaborations"}</span>
      </div>
      {offers.length > 0 ? (
        <div className="cs-collaboration-grid">
          <div className="cs-offer-queue">
            <div className="cs-filter-group" role="group" aria-label="Filter offers">
              {(Object.keys(groups) as OfferFilter[]).map((key) => (
                <button aria-pressed={key === filter} key={key} onClick={() => { setFilter(key); setOpenOfferId(null); }}>
                  {groups[key].label} <span>{groups[key].offers.length}</span>
                </button>
              ))}
            </div>
            <p className="cs-sr-only" role="status">{visible.length} {visible.length === 1 ? "offer" : "offers"} shown</p>
            {visible.length > 0 ? (
              <ul className="cs-offer-rows">
                {visible.map((offer) => (
                  <li key={offer.id}>
                    <button id={"offer-row-" + offer.id} className="cs-offer-row" aria-current={offer.id === selected?.id ? "true" : undefined} onClick={() => showRoom(offer.id)}>
                      <span className="cs-offer-row-details">
                        <small>{asCreator ? offer.workspaceName : offer.creatorName}</small>
                        <strong>{offer.campaignTitle}</strong>
                        <span className={"cs-pill status-" + offer.status}>{offerStatusLabel[offer.status]}</span>
                      </span>
                      <span className="cs-offer-row-end"><time dateTime={offer.createdAt}>{date.format(new Date(offer.createdAt))}</time><ArrowRight size={17} aria-hidden="true" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <div className="cs-empty"><ClipboardList size={22} aria-hidden="true" /><p>No offers match this view.</p></div>}
          </div>
          {selected ? (
            <CollaborationRoom key={selected.id} offer={selected} persona={persona} api={api} perform={perform} busy={busy} onBack={showQueue} />
          ) : (
            <div className="cs-room-placeholder">
              <span className="cs-process-icon"><MessageSquareText size={25} aria-hidden="true" /></span>
              <h3>Collaboration room</h3>
              <p>Select an offer to view the brief, deliverables and feedback.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="cs-empty"><ClipboardList size={25} aria-hidden="true" /><p>{asCreator ? "Offers from brands will appear here." : "Open a campaign and find a creator to send your first offer."}</p></div>
      )}
    </section>
  );
}
