import type { OfferStatus } from "@/types/workspace";

export type OfferPersona = "brand" | "creator";

export const offerStatusLabel: Record<OfferStatus, string> = {
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
