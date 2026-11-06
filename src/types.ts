export interface OfferInput {
  url: string;
  title: string;
  price: string;
  currency: string;
  condition: string;
  description: string;
  location: string;
  sellerType: string;
  listingDate?: string;
  imageBase64: string | null;
  imageMimeType: string;
}

export interface QuickScanResult {
  dealVerdict: string;
  dealScore: number;
  estimatedFairPrice: string;
  savingsPercentage: string;
  quickHeadline: string;
  initialRisk: string;
}

export interface WebSource {
  title: string;
  uri: string;
  isVerified?: boolean;
  verificationReason?: string;
  availabilityStatus?: 'in_stock' | 'out_of_stock' | 'unknown';
}

export interface MarketSearchResult {
  text: string;
  sources: WebSource[];
}

export interface RedFlag {
  severity: 'high' | 'medium' | 'low' | 'positive';
  flag: string;
  explanation: string;
}

export interface DeepAnalysisResult {
  product: {
    identifiedName: string;
    category: string;
    detectedCondition: string;
    specsSummary: string;
    stockAvailability: 'in_stock' | 'out_of_stock' | 'low_stock' | 'unknown';
  };
  pricing: {
    offeredPrice: number;
    currency: string;
    fairMarketPrice: number;
    marketMinPrice: number;
    marketMaxPrice: number;
    medianPrice: number;
    priceDifferenceAmount: number;
    priceDifferencePercentage: number;
    isBelowMarket: boolean;
  };
  rawStats?: {
    marketVolatility: 'low' | 'medium' | 'high';
    demandLevel: 'low' | 'moderate' | 'high' | 'viral';
    listingAgeAvgDays: number;
  };
  dealScore: {
    score: number;
    ratingLabel: string;
    recommendation: 'KUPUJ' | 'NEGOCJUJ' | 'CZEKAJ' | 'ODRADZAM';
    rationale: string;
  };
  safetyAndRedFlags: RedFlag[];
  negotiationStrategy: {
    suggestedOffer: number;
    maxWalkingPrice: number;
    leveragePoints: string[];
    readyMessageToSeller: string;
  };
  depreciationForecast: string;
  audioBriefingScript: string;
}

export interface ComparisonStore {
  platform: 'Ceneo' | 'Allegro' | 'Amazon.pl' | 'OLX';
  seller: string;
  price: number;
  currency: string;
  condition: string;
  shipping: string;
  url: string;
  isBestPrice: boolean;
  rating?: string;
  availability?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  event?: string;
}

export interface PriceComparisonData {
  productName: string;
  bestPrice: number;
  worstPrice: number;
  averagePrice: number;
  savingsVsHighest: number;
  stores: ComparisonStore[];
  marketVerdict: string;
  priceHistory30d?: PriceHistoryPoint[];
  isAllTimeLow?: boolean;
  min30d?: number;
  max30d?: number;
}

export interface DateFreshnessResult {
  diffDays: number;
  status: 'fresh' | 'standard' | 'aging' | 'stale';
  label: string;
  availabilityChance: string;
  riskNotice: string;
  checkedAt: string;
}

export interface ShoppingAdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: WebSource[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  price: string;
  currency: string;
  verdict: string;
  score: number;
  analysis: DeepAnalysisResult;
  audioBase64?: string;
}

export interface SimilarDealItem {
  title: string;
  platform: 'Allegro' | 'OLX' | 'Ceneo' | 'Amazon' | string;
  price: number | null;
  productPrice?: number | null;
  currency: string;
  condition: string;
  url: string;
  shipping: string;
  shippingCost?: number | null;
  totalCost?: number | null;
  isTotalCostKnown?: boolean;
  isCheaper: boolean;
  priceDifferenceVsTarget: number;
  matchAccuracy: number | null;
  isCoreProduct: boolean;
  availabilityStatus: 'in_stock' | 'out_of_stock' | 'unknown' | 'low_stock';
  shippingSpeed?: string | null;
  badge?: string;
  seller?: string;
  verificationStatus?: string;
  verificationEvidence?: string[];
}

export interface InstantDealResult {
  query: string;
  targetProduct: {
    title: string;
    identifiedPrice: number | null;
    currency: string;
  };
  verdict: 'BIERZ TERAZ' | 'NEGOCJUJ' | 'SZUKAJ DALEJ';
  verdictReason: string;
  savingsAmount: number;
  savingsPercentage: number;
  isProfitable: boolean;
  benchmarkPrice: number | null;
  similarDeals: SimilarDealItem[];
  safetyTip: string;
  confidenceScore: number | null;
  exactLiveLinks?: {
    allegro: string;
    olx: string;
    ceneo: string;
    amazon: string;
  };
  groundingSources?: WebSource[];
  rawMarketStats?: {
    totalActiveOffers: number;
    medianPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    priceStandardDeviation?: number;
    lastPriceChange?: string;
  };
  dealzRanking?: import('./types/dealz').DealzRankingResult;
  marketplaceSearchLinks?: import('./types/dealz').MarketplaceSearchLink[];
}



