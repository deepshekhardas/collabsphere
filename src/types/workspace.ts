export type WorkspaceRole = "owner" | "editor";
export type CampaignStatus = "draft" | "open" | "closed";
export type OfferStatus = "sent" | "accepted" | "declined" | "withdrawn" | "submitted" | "changes_requested" | "approved";

export interface CreatorProfile {
  userId: string;
  displayName: string;
  niche: string;
  bio: string;
  portfolioUrl: string;
  published: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  role: WorkspaceRole;
}

export interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  brief: string;
  status: CampaignStatus;
  createdAt: string;
}

export interface Deliverable {
  revision: number;
  url: string;
  note: string;
  createdAt: string;
  review: "approved" | "changes_requested" | null;
  feedback: string;
}

export interface Offer {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brief: string;
  workspaceName: string;
  creatorName: string;
  viewerIsCreator: boolean;
  amountCents: number;
  note: string;
  status: OfferStatus;
  createdAt: string;
  deliverables: Deliverable[];
}

export interface WorkspaceActivity {
  id: string;
  kind: string;
  detail: string;
  createdAt: string;
}

export interface AccountWorkspace {
  account: { email: string };
  workspaces: Workspace[];
  creator: CreatorProfile | null;
  offers: Offer[];
}

export interface BrandWorkspace {
  workspace: Workspace;
  campaigns: Campaign[];
  offers: Offer[];
  members: WorkspaceMember[];
  pendingInvites: PendingInvite[];
  activity: WorkspaceActivity[];
}
