// src/types/index.ts
import type {
  Listing,
  User,
  Purchase,
  Review,
  AgentCategory,
  PricingModel,
  ListingStatus,
} from "@prisma/client";

export type { AgentCategory, PricingModel, ListingStatus };

// Listing with seller info (used in marketplace views)
export type ListingWithSeller = Listing & {
  seller: Pick<User, "id" | "name" | "avatarUrl">;
};

// Listing with full relations (used in detail view)
export type ListingFull = ListingWithSeller & {
  reviews: (Review & {
    author: Pick<User, "id" | "name" | "avatarUrl">;
  })[];
  _count: {
    purchases: number;
    reviews: number;
    sandboxRuns: number;
  };
};

// Purchase with listing (used in buyer dashboard)
export type PurchaseWithListing = Purchase & {
  listing: ListingWithSeller;
};

// API response shape
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Listing submission payload (from seller form)
export interface CreateListingPayload {
  name: string;
  shortDesc: string;
  fullDesc: string;
  category: AgentCategory;
  tags: string[];
  iconEmoji?: string;
  iconBg?: string;
  model: string;
  systemPrompt: string;
  requiredInputs: string[];
  exampleOutput: string;
  pricingModel: PricingModel;
  priceUsd: number; // in dollars (not cents) — API converts
}

// Sandbox run payload
export interface SandboxRunPayload {
  listingId: string;
  input: Record<string, string>;
}

// Purchase checkout payload
export interface CreateCheckoutPayload {
  listingId: string;
  licenseType: "PERSONAL" | "COMMERCIAL";
}
