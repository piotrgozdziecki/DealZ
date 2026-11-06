/**
 * DEALZ UNIFIED TECHNICAL DATA CONTRACT — ITERATION 2
 * Strict zero-fake-data model, separation of direct listings from search links,
 * and comprehensive provider diagnostics.
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
  productPrice: number | null; // Explicit synonym of price
  currency: string;
  shippingCost?: number | null; // NULL if shipping cost unknown. NEVER fake 0!
  additionalMandatoryCosts?: number | null;
  totalCost?: number | null; // Computed ONLY if price and shippingCost are known
  isTotalCostKnown: boolean; // True ONLY if price and shippingCost are confirmed
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

/**
 * Separate navigation link for marketplace searches.
 * NEVER masquerades as a concrete Offer!
 */
export interface MarketplaceSearchLink {
  platform: 'Allegro' | 'OLX' | 'Ceneo' | 'Amazon' | string;
  url: string;
  label: string;
  type: 'marketplace_search';
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

export type ProviderHealthStatus = 'operational' | 'unconfigured' | 'error' | 'degraded';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: string;
  latencyMs?: number;
  lastError?: string;
  message?: string;
}

export interface ProviderDiagnostics {
  id: string;
  name: string;
  isConfigured: boolean;
  requiresAuth: boolean;
  health: ProviderHealth;
  crawledCount: number;
  verifiedCount: number;
  rejectedCount: number;
  lastRunAt?: string;
  latencyMs?: number;
  lastError?: string;
}

export interface ProviderSearchResult {
  providerId: string;
  providerName: string;
  success: boolean;
  offers: Offer[];
  searchLinks?: MarketplaceSearchLink[];
  error?: string | null;
  diagnostics?: {
    latencyMs: number;
    totalCrawled: number;
    rawMatches: number;
    rejectedFilters: number;
  };
}

export interface ProductSearchProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  getDiagnostics(): ProviderDiagnostics;
  search(query: SearchQuery): Promise<ProviderSearchResult>;
}

export interface PriceObservation {
  id?: string;
  productKey: string;
  offerId: string;
  sourceId: string;
  price: number;
  currency: string;
  shippingCost?: number | null;
  totalCost?: number | null;
  verificationStatus: VerificationStatus;
  observedAt: string; // ISO 8601
  evidenceReference: string;
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
  fullyCalculatedOffers: Offer[]; // Confirmed totalCost known
  priceOnlyOffers: Offer[];       // Price known, shipping unknown
  candidateOffers: Offer[];       // Price unknown or requires verification
  marketplaceSearchLinks: MarketplaceSearchLink[];
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
  diagnostics: {
    totalCandidates: number;
    offersWithPrice: number;
    offersWithConfirmedVariant: number;
    partiallyVerifiedCount: number;
    fullyVerifiedCount: number;
    rejectedCount: number;
    staleOrUnavailableCount: number;
    providers: ProviderDiagnostics[];
  };
  aiInsight?: {
    summary: string;
    verdict: 'BIERZ TERAZ' | 'NEGOCJUJ' | 'CZEKAJ' | 'ODRADZAM';
    verdictReason: string;
    cautionNotes: string[];
    variantDifferences?: string[];
  };
}

export interface SearchApiResponse<T = any> {
  success: boolean;
  status: 'completed' | 'partial' | 'no_results' | 'source_unavailable' | 'error';
  data?: T;
  errors?: string[];
  sourcesQueried: string[];
  sourcesSucceeded: string[];
  sourcesFailed: string[];
  fetchedAt: string;
}
