/**
 * DEALZ CORE ENGINES — ITERATION 2
 * 1. Query Understanding
 * 2. Product Identity Resolver & Match Level
 * 3. Price Calculation Engine (Strict Polish format parsing, zero fake defaults)
 * 4. Offer Normalizer & Direct Listing URL Validator
 * 5. Offer Verification Engine
 * 6. Duplicate Detection (URL canonicalization, respects distinct sellers with same price)
 * 7. Ranking Engine (Distinct groups: TotalCost known, Price only, Candidates)
 */

import {
  Offer,
  ProductIdentity,
  ProductCondition,
  SearchQuery,
  VerificationStatus,
  DealzRankingResult,
  MarketplaceSearchLink
} from '../types/dealz.js';

// ==========================================
// 1. QUERY UNDERSTANDING
// ==========================================
export function parseUserQuery(rawInput: string): SearchQuery {
  const clean = rawInput ? rawInput.trim() : '';
  const query: SearchQuery = {
    rawQuery: clean,
    extractedIdentifiers: [],
    attributes: {},
    conditionPreference: 'any',
  };

  if (!clean) return query;

  // Extract EAN / GTIN / UPC / MPN (8, 12, 13, 14 digits)
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

  // Detect voltage / power if applicable (e.g. "600w", "18v", "24kw")
  const powerMatch = clean.match(/\b(\d+)\s*(w|v|mah|kpa|kw|km)\b/gi);
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
  let brand = detectedBrand ? detectedBrand.trim() : null;
  let model = detectedModel ? detectedModel.trim() : null;

  // Extract brand if missing
  if (!brand && rawTitle) {
    const tokens = rawTitle.trim().split(/\s+/);
    if (tokens.length > 0 && /^[A-Z][a-zA-Z0-9_-]+$/.test(tokens[0]) && tokens[0].length >= 2) {
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
  candidateInput: ProductIdentity | string
): 'exact_match' | 'high_confidence' | 'possible_match' | 'incompatible' {
  const candidate = typeof candidateInput === 'string' 
    ? resolveProductIdentity(candidateInput) 
    : candidateInput;
  
  if (!candidate || !candidate.title) return 'incompatible';

  const tTitle = (target.title || '').toLowerCase();
  const cTitle = (candidate.title || '').toLowerCase();

  // Accessory check: if candidate is accessory (etui, case, szkło, pokrowiec) and target is not
  const accessoryPattern = /\b(etui|pokrowiec|case|szkło|folia|pasek|uchwyt|obudowa|cover)\b/i;
  if (accessoryPattern.test(cTitle) && !accessoryPattern.test(tTitle)) {
    return 'incompatible';
  }

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

  // Also check inline storage difference in title (e.g. 128GB vs 256GB)
  const tStorage = tTitle.match(/\b(\d+)\s*(gb|tb)\b/i)?.[0]?.replace(/\s/g, '');
  const cStorage = cTitle.match(/\b(\d+)\s*(gb|tb)\b/i)?.[0]?.replace(/\s/g, '');
  if (tStorage && cStorage && tStorage !== cStorage) {
    return 'incompatible';
  }

  // 4. Word similarity matching
  const targetWords = tTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3);
  const candWords = cTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3);

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
// 3. STRICT POLISH PRICE PARSER & CALCULATOR
// ==========================================
export function parsePolishPrice(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return !isNaN(raw) && raw > 0 ? Math.round(raw * 100) / 100 : null;
  }
  if (typeof raw !== 'string') return null;

  let str = raw.trim();
  if (!str) return null;

  // Strip currency words and symbols
  str = str.replace(/(?:zł|pln|eur|usd|\$|€)/gi, '').trim();

  // If contains comma AND dot:
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European format: 1.299,99 -> dots are thousands, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,299.99 -> commas are thousands, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma: e.g. "309,90" or "1 299,99"
    str = str.replace(/\s/g, '').replace(',', '.');
  } else {
    // Check if dot is thousand separator with 3 trailing digits e.g. "1.299"
    if (/^\d{1,3}\.\d{3}$/.test(str.trim())) {
      str = str.replace('.', '');
    } else {
      str = str.replace(/\s/g, '');
    }
  }

  // Remove any remaining stray non-digit/dot characters
  str = str.replace(/[^\d.]/g, '');

  const num = parseFloat(str);
  return !isNaN(num) && num > 0 ? Math.round(num * 100) / 100 : null;
}

export function calculateTotalCost(
  price: number | null,
  shippingCost: number | null | undefined,
  mandatoryCosts?: number | null | undefined
): {
  productPrice: number | null;
  shippingCost: number | null;
  mandatoryCosts: number | null;
  totalCost: number | null;
  isTotalCostKnown: boolean;
} {
  // If price is unknown, total cost CANNOT be computed. NEVER assume 0!
  if (price === null || price === undefined || isNaN(price) || price <= 0) {
    return {
      productPrice: null,
      shippingCost: shippingCost ?? null,
      mandatoryCosts: mandatoryCosts ?? null,
      totalCost: null,
      isTotalCostKnown: false,
    };
  }

  // If shipping cost is unknown, we cannot determine totalCost accurately
  if (shippingCost === null || shippingCost === undefined || isNaN(shippingCost) || shippingCost < 0) {
    return {
      productPrice: price,
      shippingCost: null,
      mandatoryCosts: mandatoryCosts ?? null,
      totalCost: null,
      isTotalCostKnown: false,
    };
  }

  const mand = mandatoryCosts !== null && mandatoryCosts !== undefined && !isNaN(mandatoryCosts) && mandatoryCosts >= 0
    ? mandatoryCosts
    : 0;

  const total = Math.round((price + shippingCost + mand) * 100) / 100;

  return {
    productPrice: price,
    shippingCost,
    mandatoryCosts: mand > 0 ? mand : null,
    totalCost: total,
    isTotalCostKnown: true,
  };
}

// ==========================================
// 4. DIRECT LISTING URL VALIDATION
// ==========================================
/**
 * Strict validation: distinguishes direct item listings from search / category pages.
 * Never defaults to true! If ambiguous, returns false.
 */
export function checkIsDirectListingUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const u = new URL(urlStr);

    // Only HTTPS allowed
    if (u.protocol !== 'https:') return false;

    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    // Block generic search / category query strings
    if (path.includes('/szukaj') || path.includes('/listing') || path.includes('/oferty/q-') || path.includes('/search') || path === '/' || path === '') {
      return false;
    }

    // 1. Allegro:
    // Direct listing: allegro.pl/oferta/[slug-with-numeric-id] or allegro.pl/produkt/[id]
    if (host.includes('allegro.pl')) {
      if (path.startsWith('/oferta/') && /\d{6,}/.test(path)) return true;
      if (path.startsWith('/produkt/') && /\d{4,}/.test(path)) return true;
      return false;
    }

    // 2. OLX:
    // Direct listing: olx.pl/d/oferta/[slug-id].html or olx.pl/oferta/[slug-id].html
    if (host.includes('olx.pl')) {
      if ((path.startsWith('/d/oferta/') || path.startsWith('/oferta/')) && (/\.html?$/i.test(path) || /\bID[a-zA-Z0-9]+\b/i.test(path))) {
        return true;
      }
      return false;
    }

    // 3. Ceneo:
    // Direct product: ceneo.pl/12345678 (numeric product ID) or ceneo.pl/produkt/
    if (host.includes('ceneo.pl')) {
      if (/^\/\d{7,10}$/.test(path)) return true;
      if (path.startsWith('/produkt/')) return true;
      return false;
    }

    // 4. Amazon:
    // Direct product: amazon.pl/dp/[ASIN] or amazon.pl/gp/product/[ASIN]
    if (host.includes('amazon.')) {
      if (path.includes('/dp/') || path.includes('/gp/product/')) {
        return true;
      }
      return false;
    }

    // 5. Generic e-commerce stores:
    // Must contain explicit product path pattern with unique identifier
    if (
      (path.includes('/produkt/') || path.includes('/p/') || path.includes('/item/') || path.includes('/product/')) &&
      !path.includes('/kategoria/') &&
      !path.includes('/category/')
    ) {
      // Must have a non-empty product slug or ID
      const segments = path.split('/').filter(Boolean);
      return segments.length >= 2;
    }

    return false;
  } catch {
    return false;
  }
}

// ==========================================
// 5. OFFER NORMALIZER & VERIFICATION
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
  mandatoryCostsRaw?: any;
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
  const price = parsePolishPrice(raw.priceRaw);

  // 2. Shipping cost normalization: extract numeric or null.
  let shippingCost: number | null = null;
  if (typeof raw.shippingRaw === 'number' && !isNaN(raw.shippingRaw) && raw.shippingRaw >= 0) {
    shippingCost = raw.shippingRaw;
  } else if (typeof raw.shippingRaw === 'string') {
    const lowerShip = raw.shippingRaw.toLowerCase();
    // Only set to 0 if explicitly verified as free shipping in this specific listing
    if (lowerShip.includes('darmowa') || lowerShip.includes('0 zł') || lowerShip.includes('gratis') || lowerShip === '0') {
      shippingCost = 0;
    } else {
      shippingCost = parsePolishPrice(raw.shippingRaw);
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
    if (aLow.includes('brak') || aLow.includes('niedostępny') || aLow.includes('out_of_stock') || aLow.includes('sprzedane')) {
      availability = 'out_of_stock';
    } else if (aLow.includes('ostatn') || aLow.includes('low_stock') || aLow.includes('1 szt')) {
      availability = 'low_stock';
    } else if (aLow.includes('magazyn') || aLow.includes('dostępn') || aLow.includes('in_stock') || aLow.includes('kup teraz')) {
      availability = 'in_stock';
    }
  }

  // 5. Direct listing URL check
  const isDirect = checkIsDirectListingUrl(raw.offerUrl);

  // 6. Total cost calculation
  const mandatoryCosts = parsePolishPrice(raw.mandatoryCostsRaw);
  const costCalc = calculateTotalCost(price, shippingCost, mandatoryCosts);

  // 7. Product Identity
  const product = resolveProductIdentity(raw.title, raw.brand, raw.model);

  // 8. Determine honest Verification Status
  let verificationStatus: VerificationStatus = 'unverified';
  const evidence = raw.verificationEvidence ? [...raw.verificationEvidence] : [];

  if (availability === 'out_of_stock') {
    verificationStatus = 'unavailable';
  } else if (isDirect && price !== null && costCalc.isTotalCostKnown) {
    verificationStatus = 'verified';
    evidence.push('Potwierdzono bezpośredni link do oferty, cenę oraz koszt całkowity');
  } else if (isDirect && price !== null) {
    verificationStatus = 'partially_verified';
    evidence.push('Potwierdzono bezpośrednią ofertę i cenę jednostkową (koszt wysyłki nieznany)');
  } else if (price !== null) {
    verificationStatus = 'partially_verified';
    evidence.push('Odczytano cenę z wyników sieciowych');
  } else {
    verificationStatus = 'unverified';
    evidence.push('Kandydatura bez potwierdzonej ceny jednostkowej');
  }

  // 9. Data completeness score (0 - 100)
  let completeness = 10;
  if (price !== null) completeness += 35;
  if (costCalc.isTotalCostKnown) completeness += 20;
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
    productPrice: price,
    currency: raw.currency || 'PLN',
    shippingCost,
    additionalMandatoryCosts: costCalc.mandatoryCosts,
    totalCost: costCalc.totalCost,
    isTotalCostKnown: costCalc.isTotalCostKnown,
    availability,
    shippingSpeed: raw.shippingSpeedRaw || null,
    offerUrl: raw.offerUrl,
    isDirectListingUrl: isDirect,
    imageUrl: raw.imageUrl || null,
    fetchedAt: nowIso,
    verifiedAt: nowIso,
    verificationStatus,
    verificationEvidence: evidence,
    sourceReference: raw.sourceId,
    dataCompleteness: Math.min(100, completeness),
  };
}

// ==========================================
// 6. DUPLICATE DETECTION
// ==========================================
export function deduplicateOffers(offers: Offer[]): Offer[] {
  // Map of canonical key -> Offer
  const offerMap = new Map<string, Offer>();

  for (const offer of offers) {
    if (!offer || !offer.offerUrl) continue;

    // 1. Clean canonical URL
    let canonicalUrl = offer.offerUrl;
    try {
      const u = new URL(offer.offerUrl);
      const cleanParams = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        const lowerK = k.toLowerCase();
        if (
          !lowerK.startsWith('utm_') &&
          !lowerK.startsWith('fbclid') &&
          !lowerK.startsWith('gclid') &&
          !lowerK.startsWith('gad_source') &&
          !lowerK.startsWith('gbraid') &&
          !lowerK.startsWith('wbraid') &&
          !lowerK.startsWith('_gl') &&
          lowerK !== 'ref' &&
          lowerK !== 'tag'
        ) {
          cleanParams.append(k, v);
        }
      }
      const paramStr = cleanParams.toString();
      canonicalUrl = `${u.origin}${u.pathname}${paramStr ? '?' + paramStr : ''}`;
    } catch {
      // keep
    }

    // Secondary collision key: same seller + same title
    const sellerKey = `${(offer.sourceId || '').toLowerCase()}_${(offer.sellerName || '').toLowerCase()}_${(offer.product?.title || '').toLowerCase().substring(0, 45)}`;
    
    // Choose primary canonical key (prefer URL if valid, else sellerKey)
    const primaryKey = canonicalUrl || sellerKey;

    const existing = offerMap.get(primaryKey) || offerMap.get(sellerKey);

    if (existing) {
      // Keep the lower price if available
      const newPrice = offer.totalCost ?? offer.price;
      const existingPrice = existing.totalCost ?? existing.price;

      if (newPrice !== null && (existingPrice === null || newPrice < existingPrice)) {
        offerMap.set(primaryKey, offer);
        offerMap.set(sellerKey, offer);
      }
    } else {
      offerMap.set(primaryKey, offer);
      offerMap.set(sellerKey, offer);
    }
  }

  return Array.from(new Set(offerMap.values()));
}

// ==========================================
// 7. RANKING ENGINE (Data-driven, no penalties)
// ==========================================
export function rankOffers(
  query: SearchQuery,
  offers: Offer[],
  searchLinks: MarketplaceSearchLink[] = [],
  rawCandidateCount?: number
): DealzRankingResult {
  const totalCandidates = rawCandidateCount ?? offers.length;

  // 1. Deduplicate
  const uniqueOffers = deduplicateOffers(offers);

  // 2. Filter incompatible products
  const compatibleOffers: Offer[] = [];
  let rejectedCount = 0;

  for (const o of uniqueOffers) {
    // Filter condition preference if strictly specified
    if (query.conditionPreference && query.conditionPreference !== 'any' && o.condition !== 'unknown') {
      if (o.condition !== query.conditionPreference) {
        rejectedCount++;
        continue;
      }
    }

    // Filter brand incompatibility
    const matchLevel = checkProductMatchLevel(
      { title: query.rawQuery, brand: query.extractedBrand, model: query.extractedModel },
      o.product
    );

    if (matchLevel === 'incompatible') {
      rejectedCount++;
      continue;
    }

    compatibleOffers.push(o);
  }

  // 3. Partition into 3 distinct classes (Etap 7)
  const fullyCalculatedOffers = compatibleOffers
    .filter((o): o is Offer & { totalCost: number } => o.isTotalCostKnown && typeof o.totalCost === 'number' && o.totalCost > 0)
    .sort((a, b) => a.totalCost - b.totalCost);

  const priceOnlyOffers = compatibleOffers
    .filter((o): o is Offer & { price: number } => !o.isTotalCostKnown && o.price !== null && o.price > 0)
    .sort((a, b) => a.price - b.price);

  const candidateOffers = compatibleOffers.filter((o) => o.price === null || o.price <= 0);

  // Sorted list: fully calculated first, followed by price-only, followed by candidates
  const sortedOffers = [...fullyCalculatedOffers, ...priceOnlyOffers, ...candidateOffers];

  // 4. Counts breakdown
  const offersWithPrice = sortedOffers.filter((o) => o.price !== null && o.price > 0);
  const offersWithConfirmedVariant = sortedOffers.filter((o) => o.product.variant && Object.keys(o.product.variant).length > 0).length;
  const partiallyVerifiedCount = sortedOffers.filter((o) => o.verificationStatus === 'partially_verified').length;
  const fullyVerifiedCount = sortedOffers.filter((o) => o.verificationStatus === 'verified').length;
  const staleOrUnavailableCount = sortedOffers.filter((o) => o.verificationStatus === 'stale' || o.verificationStatus === 'unavailable').length;

  // 5. Best offers
  const lowestTotalCostOffer = fullyCalculatedOffers.length > 0 ? fullyCalculatedOffers[0] : null;
  const lowestPriceOffer = offersWithPrice.length > 0 ? [...offersWithPrice].sort((a, b) => a.price! - b.price!)[0] : null;

  // Best new offer (strictly condition === 'new')
  const newWithCost = fullyCalculatedOffers.filter((o) => o.condition === 'new');
  const newWithPrice = priceOnlyOffers.filter((o) => o.condition === 'new');
  const bestNewOffer = newWithCost.length > 0 ? newWithCost[0] : newWithPrice.length > 0 ? newWithPrice[0] : null;

  // Best used offer (strictly used / refurbished / open_box)
  const isUsed = (c: ProductCondition) => c === 'used' || c === 'refurbished' || c === 'open_box';
  const usedWithCost = fullyCalculatedOffers.filter((o) => isUsed(o.condition));
  const usedWithPrice = priceOnlyOffers.filter((o) => isUsed(o.condition));
  const bestUsedOffer = usedWithCost.length > 0 ? usedWithCost[0] : usedWithPrice.length > 0 ? usedWithPrice[0] : null;

  // 6. Statistics strictly from comparable PLN prices
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let medianPrice: number | null = null;

  const comparablePrices = offersWithPrice
    .filter((o) => o.currency === 'PLN')
    .map((o) => o.price!)
    .sort((a, b) => a - b);

  if (comparablePrices.length > 0) {
    minPrice = comparablePrices[0];
    maxPrice = comparablePrices[comparablePrices.length - 1];
    const mid = Math.floor(comparablePrices.length / 2);
    medianPrice = comparablePrices.length % 2 !== 0
      ? comparablePrices[mid]
      : Math.round(((comparablePrices[mid - 1] + comparablePrices[mid]) / 2) * 100) / 100;
  }

  // 7. Recognized product identity
  const recognizedProduct: ProductIdentity = sortedOffers[0]?.product || {
    title: query.rawQuery,
    brand: query.extractedBrand || null,
    model: query.extractedModel || null,
    identifiers: query.extractedIdentifiers || [],
  };

  return {
    query,
    recognizedProduct,
    totalOffersFound: sortedOffers.length,
    verifiedOffersCount: fullyVerifiedCount,
    lowestPriceOffer,
    lowestTotalCostOffer,
    bestNewOffer,
    bestUsedOffer,
    sortedOffers,
    fullyCalculatedOffers,
    priceOnlyOffers,
    candidateOffers,
    marketplaceSearchLinks: searchLinks,
    priceStats: {
      minPrice,
      medianPrice,
      maxPrice,
      observationsCount: comparablePrices.length,
    },
    provenance: {
      sourcesQueried: Array.from(new Set(sortedOffers.map((o) => o.sourceName))),
      sourcesSucceeded: Array.from(new Set(sortedOffers.filter((o) => o.price !== null).map((o) => o.sourceName))),
      sourcesFailed: [],
      fetchedAt: new Date().toISOString(),
      cached: false,
    },
    diagnostics: {
      totalCandidates,
      offersWithPrice: offersWithPrice.length,
      offersWithConfirmedVariant,
      partiallyVerifiedCount,
      fullyVerifiedCount,
      rejectedCount,
      staleOrUnavailableCount,
      providers: [],
    },
  };
}
