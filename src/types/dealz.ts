/**
 * DEALZ UNIFIED TECHNICAL DATA CONTRACT
 * As specified in Master Engineering Directive
 */

export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'stale'
  | 'unavailable';

export type ProductCondition =
  | 'new'
  | 'used'
  | 'refurbished'
  | 'open_box'
  | 'unknown';

export interface ProductIdentity {
  title: string;
  brand?: string | null;
  model?: string | null;
  identifiers?: string[]; // EAN, GTIN, MPN, UPC
  variant?: Record<string, string>; // e.g. { color: "Space Gray", storage: "256GB" }
  attributes?: Record<string, string | number | boolean>;
  identityConfidence?: number; // 0 - 100
  category?: string | null;
}

export interface Offer {
  id: string;
  sourceId: string;
  sourceName: string; // e.g. "Allegro", "Ceneo", "OLX", "Amazon.pl", "Sklep Partnerski"
  product: ProductIdentity;
  sellerName?: string | null;
  sellerType?: 'retailer' | 'private' | 'official_store' | 'unknown';
  condition: ProductCondition;
  price: number | null; // NULL if price is unknown. NEVER fake 0!
  currency: string;
  shippingCost?: number | null; // NULL if shipping cost unknown. NEVER fake 0!
  additionalMandatoryCosts?: number | null;
  totalCost?: number | null; // Computed ONLY if price and shippingCost are known
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'preorder' | 'unknown';
  shippingSpeed?: string | null;
  offerUrl: string;
  isDirectListingUrl: boolean; // TRUE if points directly to specific item, FALSE if search/category
  imageUrl?: string | null;
  fetchedAt: string; // ISO 8601
  verifiedAt?: string | null;
  verificationStatus: VerificationStatus;
  verificationEvidence?: string[];
  sourceReference?: string | null;
  dataCompleteness: number; // 0 - 100
}

export interface SearchQuery {
  rawQuery: string;
  extractedBrand?: string | null;
  extractedModel?: string | null;
  extractedIdentifiers?: string[];
  attributes?: Record<string, string>;
  conditionPreference?: ProductCondition | 'any';
  budgetMax?: number | null;
  location?: string | null;
  parsedIntent?: string;
  clarificationNeeded?: string | null;
}

export interface ProviderSearchResult {
  providerId: string;
  providerName: string;
  success: boolean;
  offers: Offer[];
  error?: string | null;
  diagnostics?: {
    latencyMs: number;
    totalCrawled: number;
    rawMatches: number;
    rejectedFilters: number;
  };
}

export interface PriceObservation {
  offerId: string;
  productKey: string;
  sourceId: string;
  price: number;
  currency: string;
  shippingCost?: number | null;
  totalCost?: number | null;
  observedAt: string; // ISO 8601
  verificationStatus: VerificationStatus;
}

export interface DealzRankingResult {
  query: SearchQuery;
  recognizedProduct: ProductIdentity;
  totalOffersFound: number;
  verifiedOffersCount: number;
  lowestPriceOffer: Offer | null;
  lowestTotalCostOffer: Offer | null;
  bestNewOffer: Offer | null;
  bestUsedOffer: Offer | null;
  sortedOffers: Offer[];
  priceStats: {
    minPrice: number | null;
    medianPrice: number | null;
    maxPrice: number | null;
    observationsCount: number;
  };
  provenance: {
    sourcesQueried: string[];
    sourcesSucceeded: string[];
    sourcesFailed: string[];
    fetchedAt: string;
    cached: boolean;
  };
  aiInsight?: {
    summary: string;
    verdict: 'BIERZ TERAZ' | 'NEGOCJUJ' | 'CZEKAJ' | 'ODRADZAM';
    verdictReason: string;
    cautionNotes: string[];
    variantDifferences?: string[];
  };
}

export interface DiagnosticStatus {
  service: string;
  status: 'operational' | 'degraded' | 'offline' | 'needs_auth';
  lastCheck: string;
  details?: string;
  metrics?: {
    requestCount: number;
    errorRate: number;
    averageLatencyMs: number;
  };
}
