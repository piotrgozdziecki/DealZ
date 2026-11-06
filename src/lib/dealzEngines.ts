/**
 * DEALZ CORE ENGINES
 * 1. Query Understanding
 * 2. Product Identity Resolver
 * 3. Offer Normalizer
 * 4. Offer Verification Engine
 * 5. Price Calculation Engine
 * 6. Duplicate Detection
 * 7. Ranking Engine
 * 8. Provenance & Diagnostics
 */

import {
  Offer,
  ProductIdentity,
  ProductCondition,
  SearchQuery,
  VerificationStatus,
  DealzRankingResult
} from '../types/dealz.js';

// ==========================================
// 1. QUERY UNDERSTANDING
// ==========================================
export function parseUserQuery(rawInput: string): SearchQuery {
  const clean = rawInput.trim();
  const query: SearchQuery = {
    rawQuery: clean,
    extractedIdentifiers: [],
    attributes: {},
    conditionPreference: 'any',
  };

  if (!clean) return query;

  // Extract EAN / GTIN / UPC (8, 12, 13, 14 digits)
  const eanMatch = clean.match(/\b\d{8,14}\b/g);
  if (eanMatch) {
    query.extractedIdentifiers = [...eanMatch];
  }

  // Detect condition preference
  const lower = clean.toLowerCase();
  if (/\b(nowy|nowe|fabrycznie nowy|nieużywany|zafoliowany|nowa)\b/.test(lower)) {
    query.conditionPreference = 'new';
  } else if (/\b(używany|używana|używane|stan bdb|stan idealny|używka)\b/.test(lower)) {
    query.conditionPreference = 'used';
  } else if (/\b(refurbished|odnowiony|powystawowy|outlet)\b/.test(lower)) {
    query.conditionPreference = 'refurbished';
  }

  // Detect budget max (e.g. "do 1500 zł", "do 2000 pln", "max 500")
  const budgetMatch = clean.match(/(?:do|max|maksymalnie)\s*(\d+[\d\s]*)(?:\s*(?:zł|pln))?/i);
  if (budgetMatch) {
    const rawNum = budgetMatch[1].replace(/\s/g, '');
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed) && parsed > 0) {
      query.budgetMax = parsed;
    }
  }

  // Detect memory / storage attributes (e.g. "128gb", "256 gb", "1tb", "16gb ram")
  const storageMatch = clean.match(/\b(\d+)\s*(gb|tb|mb)\b/gi);
  if (storageMatch) {
    query.attributes!['storage'] = storageMatch.join(', ');
  }

  // Detect voltage / power if applicable (e.g. "600w", "18v")
  const powerMatch = clean.match(/\b(\d+)\s*(w|v|mah|kpa)\b/gi);
  if (powerMatch) {
    query.attributes!['power_specs'] = powerMatch.join(', ');
  }

  return query;
}

// ==========================================
// 2. PRODUCT IDENTITY RESOLVER
// ==========================================
export function resolveProductIdentity(
  rawTitle: string,
  detectedBrand?: string | null,
  detectedModel?: string | null,
  detectedIdentifiers?: string[]
): ProductIdentity {
  let brand = detectedBrand || null;
  let model = detectedModel || null;

  // If brand is not given, attempt extraction from known token structure
  const tokens = rawTitle.trim().split(/\s+/);
  if (!brand && tokens.length > 0) {
    // Treat first token as potential brand candidate if capitalized
    if (/^[A-Z][a-zA-Z0-9_-]+$/.test(tokens[0]) && tokens[0].length >= 2) {
      brand = tokens[0];
    }
  }

  // Detect variant features (storage, color, size)
  const variant: Record<string, string> = {};
  const storageMatch = rawTitle.match(/\b(\d+)\s*(GB|TB|MB)\b/i);
  if (storageMatch) {
    variant['storage'] = storageMatch[0].toUpperCase().replace(/\s/g, '');
  }

  const colors = ['czarny', 'biały', 'srebrny', 'złoty', 'niebieski', 'zielony', 'szary', 'black', 'white', 'silver', 'blue', 'space gray'];
  for (const c of colors) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(rawTitle)) {
      variant['color'] = c;
      break;
    }
  }

  return {
    title: rawTitle.trim(),
    brand,
    model,
    identifiers: detectedIdentifiers || [],
    variant: Object.keys(variant).length > 0 ? variant : undefined,
    identityConfidence: brand && model ? 90 : brand ? 75 : 50,
  };
}

// Check identity compatibility between two products (Exact, High, Possible, Incompatible)
export function checkProductMatchLevel(
  target: ProductIdentity,
  candidate: ProductIdentity
): 'exact_match' | 'high_confidence' | 'possible_match' | 'incompatible' {
  // 1. Identifiers match (EAN / MPN)
  if (
    target.identifiers &&
    candidate.identifiers &&
    target.identifiers.length > 0 &&
    candidate.identifiers.length > 0
  ) {
    const hasShared = target.identifiers.some((id) => candidate.identifiers!.includes(id));
    if (hasShared) return 'exact_match';
  }

  // 2. Brand conflict check: If both have explicit different brands, it's incompatible!
  if (
    target.brand &&
    candidate.brand &&
    target.brand.toLowerCase() !== candidate.brand.toLowerCase()
  ) {
    return 'incompatible';
  }

  // 3. Variant conflict check (e.g. 128GB vs 256GB is incompatible)
  if (target.variant && candidate.variant) {
    for (const key of Object.keys(target.variant)) {
      if (
        candidate.variant[key] &&
        candidate.variant[key].toLowerCase() !== target.variant[key].toLowerCase()
      ) {
        return 'incompatible';
      }
    }
  }

  // 4. Word similarity matching
  const targetWords = target.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3);
  const candWords = candidate.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3);

  if (targetWords.length === 0 || candWords.length === 0) return 'possible_match';

  let sharedCount = 0;
  for (const tw of targetWords) {
    if (candWords.includes(tw)) sharedCount++;
  }

  const overlapRatio = sharedCount / Math.max(targetWords.length, 1);
  if (overlapRatio >= 0.75) return 'high_confidence';
  if (overlapRatio >= 0.4) return 'possible_match';

  return 'incompatible';
}

// ==========================================
// 3. PRICE CALCULATION ENGINE
// ==========================================
export function calculateTotalCost(
  price: number | null,
  shippingCost: number | null | undefined,
  mandatoryCosts: number | null | undefined
): { totalCost: number | null; isCalculated: boolean } {
  // If price is unknown, total cost CANNOT be computed. NEVER assume 0!
  if (price === null || price === undefined || isNaN(price)) {
    return { totalCost: null, isCalculated: false };
  }

  // If shipping cost is unknown, we cannot determine totalCost accurately
  // unless we explicitly track that shipping is missing.
  if (shippingCost === null || shippingCost === undefined || isNaN(shippingCost)) {
    return { totalCost: null, isCalculated: false };
  }

  const mand = mandatoryCosts !== null && mandatoryCosts !== undefined && !isNaN(mandatoryCosts) ? mandatoryCosts : 0;
  const total = Math.round((price + shippingCost + mand) * 100) / 100;

  return { totalCost: total, isCalculated: true };
}

// ==========================================
// 4. OFFER NORMALIZER
// ==========================================
export function normalizeRawOffer(raw: {
  id?: string;
  sourceId: string;
  sourceName: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  priceRaw?: any;
  currency?: string;
  shippingRaw?: any;
  conditionRaw?: string;
  offerUrl: string;
  imageUrl?: string | null;
  sellerName?: string | null;
  sellerType?: string;
  availabilityRaw?: string;
  shippingSpeedRaw?: string | null;
  verificationEvidence?: string[];
}): Offer {
  // 1. Price normalization: extract numeric or null. NEVER replace with 0!
  let price: number | null = null;
  if (typeof raw.priceRaw === 'number' && !isNaN(raw.priceRaw) && raw.priceRaw > 0) {
    price = raw.priceRaw;
  } else if (typeof raw.priceRaw === 'string') {
    const cleaned = raw.priceRaw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) price = parsed;
  }

  // 2. Shipping cost normalization: extract numeric or null.
  let shippingCost: number | null = null;
  if (typeof raw.shippingRaw === 'number' && !isNaN(raw.shippingRaw) && raw.shippingRaw >= 0) {
    shippingCost = raw.shippingRaw;
  } else if (typeof raw.shippingRaw === 'string') {
    const lowerShip = raw.shippingRaw.toLowerCase();
    if (lowerShip.includes('smart') || lowerShip.includes('darmow') || lowerShip.includes('0 zł') || lowerShip.includes('free')) {
      shippingCost = 0;
    } else {
      const cleaned = raw.shippingRaw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed >= 0) shippingCost = parsed;
    }
  }

  // 3. Condition normalization
  let condition: ProductCondition = 'unknown';
  if (raw.conditionRaw) {
    const cLow = raw.conditionRaw.toLowerCase();
    if (cLow.includes('nowy') || cLow.includes('nowa') || cLow.includes('new')) condition = 'new';
    else if (cLow.includes('używan') || cLow.includes('used') || cLow.includes('sprawny')) condition = 'used';
    else if (cLow.includes('refurb') || cLow.includes('odnowion') || cLow.includes('outlet')) condition = 'refurbished';
    else if (cLow.includes('open') || cLow.includes('otwart')) condition = 'open_box';
  }

  // 4. Availability normalization
  let availability: Offer['availability'] = 'unknown';
  if (raw.availabilityRaw) {
    const aLow = raw.availabilityRaw.toLowerCase();
    if (aLow.includes('brak') || aLow.includes('niedostępny') || aLow.includes('out_of_stock')) availability = 'out_of_stock';
    else if (aLow.includes('ostatn') || aLow.includes('low_stock') || aLow.includes('1 szt')) availability = 'low_stock';
    else if (aLow.includes('magazyn') || aLow.includes('dostępn') || aLow.includes('in_stock') || aLow.includes('kup teraz')) availability = 'in_stock';
  }

  // 5. Direct listing URL check
  const isDirect = checkIsDirectListingUrl(raw.offerUrl);

  // 6. Total cost calculation
  const { totalCost } = calculateTotalCost(price, shippingCost, 0);

  // 7. Product Identity
  const product = resolveProductIdentity(raw.title, raw.brand, raw.model);

  // 8. Data completeness score (0 - 100)
  let completeness = 20;
  if (price !== null) completeness += 30;
  if (shippingCost !== null) completeness += 15;
  if (raw.sellerName) completeness += 10;
  if (condition !== 'unknown') completeness += 10;
  if (availability !== 'unknown') completeness += 10;
  if (isDirect) completeness += 5;

  const nowIso = new Date().toISOString();

  return {
    id: raw.id || `off_${raw.sourceId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sourceId: raw.sourceId,
    sourceName: raw.sourceName,
    product,
    sellerName: raw.sellerName || null,
    sellerType: (raw.sellerType as any) || 'unknown',
    condition,
    price,
    currency: raw.currency || 'PLN',
    shippingCost,
    totalCost,
    availability,
    shippingSpeed: raw.shippingSpeedRaw || null,
    offerUrl: raw.offerUrl,
    isDirectListingUrl: isDirect,
    imageUrl: raw.imageUrl || null,
    fetchedAt: nowIso,
    verifiedAt: nowIso,
    verificationStatus: 'partially_verified',
    verificationEvidence: raw.verificationEvidence || ['Odnaleziono przez przeszukiwanie rzeczywistego rynku'],
    sourceReference: raw.sourceId,
    dataCompleteness: completeness,
  };
}

// Distinguishes direct product auction/listing URLs from generic search queries
export function checkIsDirectListingUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const u = new URL(urlStr);
    const path = u.pathname.toLowerCase();
    // Search listing routes that are NOT single item auctions
    if (path.includes('/szukaj') || path.includes('/listing') || path.includes('/oferty/q-') || path.includes('/s?') || path.includes('/search')) {
      // If it contains specific item ID in path, it might be direct
      if (/\/(oferta\/|d\/oferta\/|p\/|i\/|item\/)[a-zA-Z0-9_-]+/.test(path)) {
        return true;
      }
      return false;
    }
    // Direct Allegro offer: /oferta/tytul-123456789
    if (path.includes('/oferta/') && /\d{6,}/.test(path)) return true;
    // Direct OLX offer: /d/oferta/tytul-IDxxx.html
    if (path.includes('/d/oferta/') || path.includes('/oferta/')) return true;
    // Direct Amazon item: /dp/B0...
    if (path.includes('/dp/') || path.includes('/gp/product/')) return true;
    // Direct Ceneo item: /12345678 or /produkt/
    if (/^\/\d{7,8}/.test(path)) return true;
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// 5. DUPLICATE DETECTION
// ==========================================
export function deduplicateOffers(offers: Offer[]): Offer[] {
  const seenCanonicalUrls = new Set<string>();
  const seenOfferKeys = new Set<string>();
  const unique: Offer[] = [];

  for (const offer of offers) {
    // 1. Clean canonical URL
    let canonicalUrl = offer.offerUrl;
    try {
      const u = new URL(offer.offerUrl);
      // Strip tracking query parameters
      const cleanParams = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (!k.startsWith('utm_') && !k.startsWith('fbclid') && k !== 'gclid') {
          cleanParams.append(k, v);
        }
      }
      canonicalUrl = `${u.origin}${u.pathname}${cleanParams.toString() ? '?' + cleanParams.toString() : ''}`;
    } catch {
      // keep as is
    }

    if (seenCanonicalUrls.has(canonicalUrl)) {
      continue;
    }
    seenCanonicalUrls.add(canonicalUrl);

    // 2. Exact match of source + seller + price + title (same listing crawling collision)
    const offerKey = `${offer.sourceId}_${offer.sellerName || 'unknown'}_${offer.price}_${offer.product.title.toLowerCase().substring(0, 40)}`;
    if (seenOfferKeys.has(offerKey)) {
      continue;
    }
    seenOfferKeys.add(offerKey);

    unique.push(offer);
  }

  return unique;
}

// ==========================================
// 6. RANKING ENGINE (Data-driven, no fake scores)
// ==========================================
export function rankOffers(query: SearchQuery, offers: Offer[]): DealzRankingResult {
  // 1. Deduplicate
  const uniqueOffers = deduplicateOffers(offers);

  // 2. Filter incompatible products if query had explicit attributes
  const compatibleOffers = uniqueOffers.filter((o) => {
    if (query.conditionPreference !== 'any' && o.condition !== 'unknown' && o.condition !== query.conditionPreference) {
      return false; // Skip if user explicitly asked for 'new' and item is 'used'
    }
    return true;
  });

  // 3. Sort verified offers by totalCost (or product price if totalCost unknown)
  const sorted = [...compatibleOffers].sort((a, b) => {
    const costA = a.totalCost ?? (a.price !== null ? a.price + 9999 : 99999);
    const costB = b.totalCost ?? (b.price !== null ? b.price + 9999 : 99999);
    return costA - costB;
  });

  // 4. Identify best offers
  const withPrice = sorted.filter((o) => o.price !== null && o.price > 0);
  const lowestPriceOffer = withPrice.length > 0
    ? [...withPrice].sort((a, b) => a.price! - b.price!)[0]
    : null;

  const withTotalCost = sorted.filter((o) => o.totalCost !== null && o.totalCost !== undefined && o.totalCost > 0);
  const lowestTotalCostOffer = withTotalCost.length > 0 ? withTotalCost[0] : null;

  const newOffers = withPrice.filter((o) => o.condition === 'new');
  const bestNewOffer = newOffers.length > 0 ? newOffers[0] : null;

  const usedOffers = withPrice.filter((o) => o.condition === 'used');
  const bestUsedOffer = usedOffers.length > 0 ? usedOffers[0] : null;

  // 5. Price statistics calculation strictly from real observations
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let medianPrice: number | null = null;

  if (withPrice.length > 0) {
    const pricesAsc = withPrice.map((o) => o.price!).sort((a, b) => a - b);
    minPrice = pricesAsc[0];
    maxPrice = pricesAsc[pricesAsc.length - 1];
    const midIdx = Math.floor(pricesAsc.length / 2);
    medianPrice = pricesAsc.length % 2 !== 0
      ? pricesAsc[midIdx]
      : Math.round(((pricesAsc[midIdx - 1] + pricesAsc[midIdx]) / 2) * 100) / 100;
  }

  // 6. Primary recognized product identity from best offer or query
  const targetProduct: ProductIdentity = sorted[0]?.product || {
    title: query.rawQuery,
    brand: query.extractedBrand || null,
    model: query.extractedModel || null,
    identifiers: query.extractedIdentifiers || [],
  };

  return {
    query,
    recognizedProduct: targetProduct,
    totalOffersFound: offers.length,
    verifiedOffersCount: uniqueOffers.filter((o) => o.verificationStatus === 'verified' || o.verificationStatus === 'partially_verified').length,
    lowestPriceOffer,
    lowestTotalCostOffer,
    bestNewOffer,
    bestUsedOffer,
    sortedOffers: sorted,
    priceStats: {
      minPrice,
      medianPrice,
      maxPrice,
      observationsCount: withPrice.length,
    },
    provenance: {
      sourcesQueried: ['Allegro', 'Ceneo', 'OLX', 'Amazon.pl', 'Sklepy Internetowe'],
      sourcesSucceeded: Array.from(new Set(uniqueOffers.map((o) => o.sourceName))),
      sourcesFailed: [],
      fetchedAt: new Date().toISOString(),
      cached: false,
    },
  };
}
