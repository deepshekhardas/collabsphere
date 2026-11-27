import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Offer } from "../src/types/workspace";
import { OfferList, type OfferFilter } from "../src/components/workspace/OfferList";
import type { Api, Perform } from "../src/components/workspace/api-client";

const offer: Offer = {
  id: "current-offer",
  campaignId: "campaign",
  campaignTitle: "Field journal launch",
  brief: "Film the jacket in rain and show the inside pocket.",
  workspaceName: "Test Studio",
  creatorName: "Test Creator",
  viewerIsCreator: false,
  amountCents: 85000,
  note: "Keep the end card clear of subtitles.",
  status: "submitted",
  createdAt: "2026-11-27T07:00:00Z",
  deliverables: [
    { revision: 2, url: "https://example.test/field-journal-v2", note: "Reframed the jacket pocket.", createdAt: "2026-11-28T07:00:00Z", review: null, feedback: "" },
    { revision: 1, url: "https://example.test/field-journal-v1", note: "", createdAt: "2026-11-27T07:00:00Z", review: "changes_requested", feedback: "Hold the pocket close-up for two seconds." },
  ],
};

const api: Api = async () => { throw new Error("The API must not be called when rendering."); };
const perform: Perform = async () => { throw new Error("Actions must not be run when rendering."); };

function markup(record: Offer, persona: "brand" | "creator", filter: OfferFilter = "all", openOfferId: string | null = record.id) {
  return renderToStaticMarkup(createElement(OfferList, {
    offers: [record], persona, filter, openOfferId, api, perform,
    setFilter: () => {}, setOpenOfferId: () => {}, busy: false,
  }));
}

test("the brand room shows the current review action, brief and both revisions", () => {
  const html = markup(offer, "brand", "action");
  assert.match(html, /aria-label="Collaboration progress"/);
  assert.match(html, /id="offer-room-heading" tabindex="-1"/i);
  assert.match(html, /Review revision 2/);
  assert.match(html, /Approve revision 2/);
  assert.match(html, /Request changes/);
  assert.match(html, /Film the jacket in rain and show the inside pocket/);
  assert.match(html, /Hold the pocket close-up for two seconds/);
  assert.match(html, /href="https:\/\/example.test\/field-journal-v1"/);
  assert.match(html, /href="https:\/\/example.test\/field-journal-v2"/);
});

test("a creator submitting a revision sees the current feedback without a brand review action", () => {
  const revising: Offer = { ...offer, status: "changes_requested", viewerIsCreator: true, deliverables: [offer.deliverables[1]] };
  const html = markup(revising, "creator");
  assert.match(html, /Submit next revision/);
  assert.match(html, /Brand feedback on revision 1/);
  assert.match(html, /Hold the pocket close-up for two seconds/);
  assert.doesNotMatch(html, /Approve revision/);
  const selfReview = markup({ ...offer, viewerIsCreator: true }, "brand");
  assert.match(selfReview, /Another team member needs to review/);
  assert.doesNotMatch(selfReview, /Approve revision/);
});

test("an approved collaboration room stays open after it leaves the pending review queue", () => {
  const approved: Offer = { ...offer, status: "approved", deliverables: [{ ...offer.deliverables[0], review: "approved" }, offer.deliverables[1]] };
  const html = markup(approved, "brand", "action");
  assert.match(html, /No offers match this view/);
  assert.match(html, /Deliverable approved/);
  assert.match(html, /Back to offers/);
  assert.doesNotMatch(html, /Approve revision/);
});
