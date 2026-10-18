export type UserRole = "business" | "creator";

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  targetAudience: string;
  offer: string;
  pricePoint: string;
  location?: string;
  platforms: string[];
  monthlyBudget: string;
  brandSummary?: string;
  logoUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreatorProfile {
  id: string;
  displayName: string;
  bio: string;
  niche: string[];
  platforms: string[];
  audienceSize: string;
  socialLinks: { [key: string]: string };
  portfolioUrls: string[];
  earnings: number;
  rating: number;
  createdAt: any;
  updatedAt: any;
}

export interface Campaign {
  id: string;
  businessId: string;
  title: string;
  description: string;
  offer: string;
  budget: number;
  payoutPerCreator: number;
  niche: string[];
  platform: string[];
  scripts?: string[];
  status: "active" | "paused" | "completed";
  createdAt: any;
}

export interface Submission {
  id: string;
  campaignId: string;
  creatorId: string;
  contentUrl: string;
  contentType: "link" | "file";
  status: "pending" | "approved" | "rejected" | "revision";
  feedback?: string;
  payoutAmount: number;
  createdAt: any;
}

export interface Script {
  id: string;
  businessId: string;
  type: "ad" | "vsl" | "webinar" | "creator" | "email" | "sms";
  title: string;
  content: string;
  createdAt: any;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "deposit" | "withdrawal" | "payment_sent" | "payment_received";
  status: "pending" | "completed" | "failed";
  campaignId?: string;
  createdAt: any;
}
