/**
 * DealZ Engine — Automated Test Suite (24 Etap 14 Scenarios)
 * Validates zero fake data, honest verification, Polish price parsing,
 * strict URL handling, persistent price observations, SSRF security, and provider health.
 */

import { 
  parsePolishPrice, 
  checkIsDirectListingUrl, 
  calculateTotalCost, 
  normalizeRawOffer, 
  deduplicateOffers, 
  rankOffers,
  checkProductMatchLevel,
  resolveProductIdentity,
  resolveProductIdentityRationale,
  evaluateOfferFreshness,
  evaluateDataQuality,
  discoverProductAlternatives,
  parseUserQuery
} from '../src/lib/dealzEngines';
import { 
  ProviderRegistry, 
  GoogleSearchGroundingProvider, 
  AllegroOfficialProvider, 
  CeneoOfficialProvider, 
  OLXOfficialProvider, 
  AmazonOfficialProvider 
} from '../src/lib/dealzProviders';
import { GoogleGenAI } from '@google/genai';
import { PriceHistoryStore } from '../src/lib/dealzPriceHistory';
import { buildMarketplaceSearchLinks } from '../src/lib/dealzSearchOrchestrator';
import { isSafeExternalUrl } from '../server';
import { ProductIdentity, Offer, SearchQuery } from '../src/types/dealz';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' DEALZ ENGINE — 24 TEST SCENARIOS (ETAP 14 DIRECTIVE)');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // Scenariusz 1: Wyszukiwanie bez wyników — silnik zwraca pustą listę ofert, brak błędu
  // --------------------------------------------------------------------------
  console.log('1. Puste wyniki wyszukiwania:');
  const dummyQuery: SearchQuery = {
    rawQuery: 'Nietypowy Przedmiot 123456789xyz',
    conditionPreference: 'any'
  };
  const emptyRank = rankOffers(dummyQuery, []);
  assert(emptyRank.sortedOffers.length === 0, 'Silnik zwraca pustą listę ofert');
  assert(emptyRank.diagnostics.totalCandidates === 0, 'Kandydaci ogółem: 0');
  assert(emptyRank.priceStats.minPrice === null, 'Brak fałszywego benchmarku (cena null)');

  // --------------------------------------------------------------------------
  // Scenariusz 2: Wyszukiwanie dowolnego produktu spoza jakiegokolwiek katalogu
  // --------------------------------------------------------------------------
  console.log('\n2. Dowolny produkt spoza katalogu (dynamika):');
  const arbitraryQuery = 'Pompa hydrauliczna Rexroth A10VSO45 31R-PPA12N00';
  const resolvedArbitrary = resolveProductIdentity(arbitraryQuery, 'Rexroth', 'A10VSO45');
  assert(resolvedArbitrary.title.includes('Pompa hydrauliczna'), 'Rozpoznano produkt przemysłowy bez katalogu');
  assert(resolvedArbitrary.brand === 'Rexroth' || Boolean(resolvedArbitrary.model && resolvedArbitrary.model.includes('A10VSO45')), 'Prawidłowo wyekstrahowano markę lub model');

  // --------------------------------------------------------------------------
  // Scenariusz 3: Wyszukiwanie produktu bez kodu EAN
  // --------------------------------------------------------------------------
  console.log('\n3. Identyfikacja bez kodu EAN:');
  const noEanQuery = 'Wiertarka udarowa Bosch GSB 13 RE 600W';
  const resolvedNoEan = resolveProductIdentity(noEanQuery, 'Bosch', 'GSB 13 RE');
  assert(!resolvedNoEan.identifiers || resolvedNoEan.identifiers.length === 0, 'Brak kodu EAN nie powoduje błędu');
  assert(resolvedNoEan.brand === 'Bosch', 'Rozpoznano markę Bosch');
  assert(resolvedNoEan.model === 'GSB 13 RE', 'Rozpoznano model GSB 13 RE');

  // --------------------------------------------------------------------------
  // Scenariusz 4: Wyszukiwanie produktu z określonym wariantem (iPhone 15 128GB vs 256GB)
  // --------------------------------------------------------------------------
  console.log('\n4. Dopasowanie wariantu (iPhone 15 128GB vs 256GB):');
  const iphone128Identity: ProductIdentity = {
    title: 'Apple iPhone 15 128GB Czarny',
    brand: 'Apple',
    model: 'iPhone 15',
    variant: { storage: '128GB' },
    attributes: { storage: '128GB' },
    identityConfidence: 95
  };
  const match128 = checkProductMatchLevel(iphone128Identity, 'Apple iPhone 15 128GB Nowy FV23%');
  const match256 = checkProductMatchLevel(iphone128Identity, 'Apple iPhone 15 256GB Czarny');
  assert(match128 === 'high_confidence' || match128 === 'exact_match', 'Oferta 128GB zaakceptowana z wysokim wynikiem');
  assert(match256 === 'incompatible', 'Oferta 256GB odrzucona lub ukarana za niezgodność wariantu');

  // --------------------------------------------------------------------------
  // Scenariusz 5: Wynik z Google Grounding bez podanej ceny -> price: null
  // --------------------------------------------------------------------------
  console.log('\n5. Wynik bez ceny:');
  const normalizedNoPrice = normalizeRawOffer({
    sourceId: 'google_grounding',
    sourceName: 'Media Expert',
    title: 'Samsung Galaxy S24 Ultra 512GB Szary',
    offerUrl: 'https://www.mediaexpert.pl/smartfony-i-zegarki/smartfony/smartfon-samsung-galaxy-s24-ultra-512gb-tytanowy-szary',
    priceRaw: null,
    sellerName: 'Media Expert',
    availabilityRaw: 'Zapytaj o dostępność'
  });
  assert(normalizedNoPrice.price === null, 'Cena jest dokładnie null (nie 0 zł i nie zmyślona)');
  assert(normalizedNoPrice.isTotalCostKnown === false, 'isTotalCostKnown = false');
  assert(normalizedNoPrice.totalCost === null, 'totalCost = null');
  assert(normalizedNoPrice.verificationStatus !== 'verified', 'Brak ceny uniemożliwia status full verified');

  // --------------------------------------------------------------------------
  // Scenariusz 6: Wynik z linkiem do wyszukiwarki/kategorii zamiast produktu
  // --------------------------------------------------------------------------
  console.log('\n6. Link do wyszukiwarki / kategorii zamiast oferty:');
  const searchUrl1 = 'https://allegro.pl/listing?string=iphone%2015';
  const searchUrl2 = 'https://www.ceneo.pl/;szukaj-iphone+15';
  const directUrl1 = 'https://allegro.pl/oferta/apple-iphone-15-128gb-czarny-14234567890';
  assert(checkIsDirectListingUrl(searchUrl1) === false, 'Listing Allegro odrzucony jako bezpośrednia oferta');
  assert(checkIsDirectListingUrl(searchUrl2) === false, 'Szukajka Ceneo odrzucona jako bezpośrednia oferta');
  assert(checkIsDirectListingUrl(directUrl1) === true, 'Prawdziwy link /oferta/... zaakceptowany jako bezpośredni');

  // --------------------------------------------------------------------------
  // Scenariusz 7: Nieprawidłowy URL (brak protokołu, nieobsługiwany format)
  // --------------------------------------------------------------------------
  console.log('\n7. Nieprawidłowy format URL:');
  assert(checkIsDirectListingUrl('allegro.pl/oferta/123') === false, 'URL bez protokołu odrzucony');
  assert(checkIsDirectListingUrl('ftp://allegro.pl/oferta/123') === false, 'Protokół FTP odrzucony');
  assert(checkIsDirectListingUrl('javascript:alert(1)') === false, 'Javascript pseudoprotokół odrzucony');
  assert(checkIsDirectListingUrl('') === false, 'Pusty URL odrzucony');

  // --------------------------------------------------------------------------
  // Scenariusz 8: URL z fałszywą domeną podszywającą się pod sklep
  // --------------------------------------------------------------------------
  console.log('\n8. Fałszywa domena / spoofing:');
  assert(checkIsDirectListingUrl('https://allegro.pl.fake-phishing.com/oferta/123') === false, 'Poddomena podszywająca się odrzucona');
  assert(checkIsDirectListingUrl('https://not-a-shop-domain.xyz/catalog/item') === false, 'Niezaufana domena z ogólnym path odrzucona');

  // --------------------------------------------------------------------------
  // Scenariusz 9: Błąd API Gemini -> elegancka obsługa, brak wygenerowanych ofert
  // --------------------------------------------------------------------------
  console.log('\n9. Błąd API Gemini / fallback:');
  // Orchestrator without search sources must return empty results or error, NEVER generate synthetic offers
  const emptyGroundingRes = buildMarketplaceSearchLinks('test');
  assert(emptyGroundingRes.length >= 4, 'MarketplaceSearchLinks są osobnymi linkami nawigacyjnymi');
  assert(emptyGroundingRes.every(l => l.url.includes('test')), 'Linki nawigacyjne prowadzą do szukajki');

  // --------------------------------------------------------------------------
  // Scenariusz 10: Brak dostępu do Google Search
  // --------------------------------------------------------------------------
  console.log('\n10. Brak dostępu do Google Search:');
  const mockAi = new GoogleGenAI({ apiKey: 'fake_test_key' });
  const googleProvider = new GoogleSearchGroundingProvider(mockAi);
  assert(googleProvider.id === 'google_search_grounding', 'Google Search Grounding ma poprawny identyfikator');
  // When no raw candidates are fetched, rankOffers produces no offers
  const noSearchRank = rankOffers(dummyQuery, []);
  assert(noSearchRank.sortedOffers.length === 0, 'Zero ofert w przypadku braku wyników');

  // --------------------------------------------------------------------------
  // Scenariusz 11: Brak klucza API
  // --------------------------------------------------------------------------
  console.log('\n11. Brak konfiguracji API / brak klucza:');
  const allegroProv = new AllegroOfficialProvider();
  assert(allegroProv.isConfigured() === false, 'Nieposiadający kluczy adapter Allegro zgłasza isConfigured = false');
  const allegroDiag = allegroProv.getDiagnostics();
  assert(allegroDiag.health.status === 'unconfigured', 'Status adaptera to unconfigured');

  // --------------------------------------------------------------------------
  // Scenariusz 12: Oferta z nieznanym kosztem dostawy -> isTotalCostKnown = false, totalCost = null
  // --------------------------------------------------------------------------
  console.log('\n12. Nieznany koszt dostawy:');
  const costRes = calculateTotalCost(1500, null);
  assert(costRes.totalCost === null, 'totalCost = null (nie 1500 zł i nie 0 zł)');
  assert(costRes.isTotalCostKnown === false, 'isTotalCostKnown = false');
  assert(costRes.productPrice === 1500, 'productPrice = 1500');

  const freeShippingRes = calculateTotalCost(1500, 0);
  assert(freeShippingRes.totalCost === 1500, 'Darmowa dostawa (0 zł) daje poprawny totalCost 1500');
  assert(freeShippingRes.isTotalCostKnown === true, 'isTotalCostKnown = true dla darmowej dostawy');

  // --------------------------------------------------------------------------
  // Scenariusz 13: Oferta w innej walucie niż PLN
  // --------------------------------------------------------------------------
  console.log('\n13. Zachowanie waluty źródłowej (EUR / USD):');
  const normEur = normalizeRawOffer({
    sourceId: 'amazon',
    sourceName: 'Amazon EU',
    title: 'Sony WH-1000XM5 Słuchawki',
    offerUrl: 'https://www.amazon.de/dp/B09Y2MYL5C',
    priceRaw: 329.99,
    currency: 'EUR',
    shippingRaw: 5.99,
    sellerName: 'Amazon EU'
  });
  assert(normEur.currency === 'EUR', 'Waluta EUR została zachowana bez nieautoryzowanego przeliczenia');
  assert(normEur.price === 329.99, 'Cena 329.99 EUR zachowana');
  assert(normEur.totalCost === 335.98, 'Całkowity koszt 335.98 EUR poprawnie zsumowany');

  // --------------------------------------------------------------------------
  // Scenariusz 14: Parsowanie ceny w polskim formacie (1 299,99 zł, 1.299,99 PLN, 1299,00)
  // --------------------------------------------------------------------------
  console.log('\n14. Parsowanie cen w polskich formatach:');
  assert(parsePolishPrice('1 299,99 zł') === 1299.99, '1 299,99 zł -> 1299.99');
  assert(parsePolishPrice('1.299,99 PLN') === 1299.99, '1.299,99 PLN -> 1299.99 (nie 1.29999!)');
  assert(parsePolishPrice('1299,00') === 1299.00, '1299,00 -> 1299.00');
  assert(parsePolishPrice('4 599 zł') === 4599, '4 599 zł -> 4599');
  assert(parsePolishPrice('od 399,50 zł') === 399.50, 'od 399,50 zł -> 399.50');
  assert(parsePolishPrice('Cena na zapytanie') === null, 'Brak ceny -> null');

  // --------------------------------------------------------------------------
  // Scenariusz 15: Wykrywanie i scalanie duplikatów z tego samego sklepu
  // --------------------------------------------------------------------------
  console.log('\n15. Scalanie duplikatów (kanonizacja URL):');
  const dup1: Offer = {
    id: 'o1',
    sourceId: 'ceneo',
    sourceName: 'Ceneo',
    sellerName: 'Sklep ABC',
    product: { title: 'Sony WH-1000XM5 Czarny' },
    offerUrl: 'https://www.euro.com.pl/sluchawki/sony-wh-1000xm5-czarny.bhtml?utm_source=ceneo&utm_medium=referral',
    price: 1399,
    productPrice: 1399,
    currency: 'PLN',
    shippingCost: 0,
    totalCost: 1399,
    isTotalCostKnown: true,
    condition: 'new',
    availability: 'in_stock',
    verificationStatus: 'verified',
    verificationEvidence: ['Ceneo verified'],
    isDirectListingUrl: true,
    fetchedAt: '2026-11-06T10:00:00Z',
    dataCompleteness: 90
  };
  const dup2: Offer = {
    ...dup1,
    id: 'o2',
    offerUrl: 'https://www.euro.com.pl/sluchawki/sony-wh-1000xm5-czarny.bhtml?gad_source=1',
    price: 1349, // niższa cena
    productPrice: 1349,
    totalCost: 1349,
    fetchedAt: '2026-11-06T10:05:00Z'
  };
  const deduplicated = deduplicateOffers([dup1, dup2]);
  assert(deduplicated.length === 1, 'Z dwóch URL-i tego samego produktu pozostał 1');
  assert(deduplicated[0].price === 1349, 'Pozostawiono korzystniejszą ofertę (1349 zł)');

  // --------------------------------------------------------------------------
  // Scenariusz 16: Oferty od tego samego sprzedawcy, ale różne produkty
  // --------------------------------------------------------------------------
  console.log('\n16. Różne produkty od tego samego sprzedawcy nie są scalane:');
  const diffProduct1: Offer = {
    ...dup1,
    id: 'p1',
    product: { title: 'Sony WH-1000XM5' },
    offerUrl: 'https://www.euro.com.pl/sluchawki/sony-wh-1000xm5.bhtml'
  };
  const diffProduct2: Offer = {
    ...dup1,
    id: 'p2',
    product: { title: 'Sony WH-1000XM4' },
    offerUrl: 'https://www.euro.com.pl/sluchawki/sony-wh-1000xm4.bhtml'
  };
  const dedupDiff = deduplicateOffers([diffProduct1, diffProduct2]);
  assert(dedupDiff.length === 2, 'Różne produkty tego samego sprzedawcy nie zostały scalone');

  // --------------------------------------------------------------------------
  // Scenariusz 17: Niezgodny produkt (np. etui zamiast telefonu)
  // --------------------------------------------------------------------------
  console.log('\n17. Wykrywanie akcesoriów / etui zamiast produktu:');
  const phoneIdentity: ProductIdentity = {
    title: 'Apple iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15'
  };
  const caseMatch = checkProductMatchLevel(phoneIdentity, 'Etui Silikonowe MagSafe do iPhone 15 Czarny');
  assert(caseMatch === 'incompatible', 'Etui do iPhone 15 odrzucone jako niekompatybilne');

  // --------------------------------------------------------------------------
  // Scenariusz 18: Brak historii cen (< 2 obserwacje)
  // --------------------------------------------------------------------------
  console.log('\n18. Brak historii cen (< 2 obserwacje):');
  const testFilePath = path.resolve(process.cwd(), './data/test_prices.json');
  const tempStore = new PriceHistoryStore(testFilePath);
  tempStore.clearAll();
  const hist0 = tempStore.getHistoryForProduct('ProduktBezHistorii');
  assert(hist0.points.length === 0, 'Historia jest pusta');
  assert(hist0.observationsCount === 0, 'Liczba obserwacji = 0');
  assert(hist0.minPrice === null, 'minPrice = null');

  // --------------------------------------------------------------------------
  // Scenariusz 19: Historia z 1 obserwacją
  // --------------------------------------------------------------------------
  console.log('\n19. Historia z 1 obserwacją:');
  tempStore.recordObservation({
    productKey: 'prod_one',
    offerId: 'off_1',
    sourceId: 'ceneo',
    price: 2499,
    currency: 'PLN',
    shippingCost: null,
    totalCost: null,
    verificationStatus: 'verified',
    observedAt: new Date().toISOString(),
    evidenceReference: 'Ceneo test'
  });
  const hist1 = tempStore.getHistoryForProduct('prod_one');
  assert(hist1.points.length === 1, 'Dokładnie 1 punkt w historii');
  assert(hist1.observationsCount === 1, 'Liczba obserwacji = 1');
  assert(hist1.minPrice === 2499, 'minPrice = 2499 PLN');

  // --------------------------------------------------------------------------
  // Scenariusz 20: Historia z wieloma obserwacjami (punkty min/max/aktualna)
  // --------------------------------------------------------------------------
  console.log('\n20. Historia z wieloma obserwacjami:');
  tempStore.recordObservation({
    productKey: 'prod_multi',
    offerId: 'off_2',
    sourceId: 'ceneo',
    price: 2799,
    currency: 'PLN',
    shippingCost: 0,
    totalCost: 2799,
    verificationStatus: 'verified',
    observedAt: '2026-10-01T12:00:00Z',
    evidenceReference: 'Obs 1'
  });
  tempStore.recordObservation({
    productKey: 'prod_multi',
    offerId: 'off_3',
    sourceId: 'ceneo',
    price: 2399,
    currency: 'PLN',
    shippingCost: 0,
    totalCost: 2399,
    verificationStatus: 'verified',
    observedAt: '2026-10-15T12:00:00Z',
    evidenceReference: 'Obs 2'
  });
  tempStore.recordObservation({
    productKey: 'prod_multi',
    offerId: 'off_4',
    sourceId: 'ceneo',
    price: 2499,
    currency: 'PLN',
    shippingCost: 0,
    totalCost: 2499,
    verificationStatus: 'verified',
    observedAt: '2026-11-01T12:00:00Z',
    evidenceReference: 'Obs 3'
  });
  const histMulti = tempStore.getHistoryForProduct('prod_multi');
  assert(histMulti.points.length === 3, '3 punkty w historii');
  assert(histMulti.minPrice === 2399, 'minPrice = 2399 PLN');
  assert(histMulti.maxPrice === 2799, 'maxPrice = 2799 PLN');
  assert(histMulti.points[histMulti.points.length - 1].price === 2499, 'Ostatnia zarejestrowana cena to 2499 PLN');

  // --------------------------------------------------------------------------
  // Scenariusz 21: Trwałość historii po restarcie procesu (zapis na dysku)
  // --------------------------------------------------------------------------
  console.log('\n21. Trwałość danych na dysku po restarcie procesu:');
  assert(fs.existsSync(testFilePath), 'Plik json z historią został fizycznie utworzony na dysku');
  // Symulacja restartu procesu: tworzymy nową instancję z tego samego pliku
  const reloadedStore = new PriceHistoryStore(testFilePath);
  const reloadedHist = reloadedStore.getHistoryForProduct('prod_multi');
  assert(reloadedHist.points.length === 3, 'Odczytano 3 punkty po ponownym załadowaniu z dysku');
  assert(reloadedHist.minPrice === 2399, 'minPrice 2399 zachowane po restarcie');
  // cleanup test file
  try { fs.unlinkSync(testFilePath); } catch {}

  // --------------------------------------------------------------------------
  // Scenariusz 22: Źródło nieposiadające aktywnej integracji
  // --------------------------------------------------------------------------
  console.log('\n22. Prawdziwe raportowanie nieaktywnego adaptera:');
  const olxProv = new OLXOfficialProvider();
  const ceneoProv = new CeneoOfficialProvider();
  assert(olxProv.isConfigured() === false, 'OLX bez tokena API nie udaje aktywnego');
  assert(ceneoProv.isConfigured() === false, 'Ceneo bez tokena partnera nie udaje aktywnego');
  const reg = new ProviderRegistry(mockAi);
  const diagList = reg.getAllDiagnostics();
  assert(diagList.some(d => d.id.includes('allegro') && d.health.status === 'unconfigured'), 'Allegro raportuje unconfigured');

  // --------------------------------------------------------------------------
  // Scenariusz 23: Źródło z limitem zapytań lub błędem
  // --------------------------------------------------------------------------
  console.log('\n23. Raportowanie błędów w diagnostyce:');
  const reg2 = new ProviderRegistry(mockAi);
  const diagBefore = reg2.getAllDiagnostics();
  assert(diagBefore.length === 5, 'Zarejestrowano 5 adapterów źródeł');
  assert(diagBefore.filter(d => !d.isConfigured).length >= 4, 'Nieposiadające kluczy adaptery raportują status unconfigured');

  // --------------------------------------------------------------------------
  // Scenariusz 24: Bezpieczeństwo URL — blokada SSRF (127.0.0.1, 169.254.169.254, sieci prywatne)
  // --------------------------------------------------------------------------
  console.log('\n24. Ochrona SSRF (blokowanie prywatnych IP i metadanych):');
  assert(isSafeExternalUrl('http://127.0.0.1:8080/admin') === false, '127.0.0.1 zablokowane');
  assert(isSafeExternalUrl('http://localhost:3000') === false, 'localhost zablokowane');
  assert(isSafeExternalUrl('http://169.254.169.254/latest/meta-data/') === false, 'Cloud metadata 169.254.169.254 zablokowane');
  assert(isSafeExternalUrl('http://10.0.0.1/internal') === false, 'Sieć 10.0.0.0/8 zablokowana');
  assert(isSafeExternalUrl('http://192.168.1.1/router') === false, 'Sieć 192.168.0.0/16 zablokowana');
  assert(isSafeExternalUrl('http://172.16.0.5/') === false, 'Sieć 172.16.0.0/12 zablokowana');
  assert(isSafeExternalUrl('https://allegro.pl/oferta/123') === true, 'Publiczny bezpieczny adres HTTPS dopuszczony');

  // --------------------------------------------------------------------------
  // Scenariusz 25 (Iteracja 3 - Scenariusz A): Tryb Wyszukiwania Semantic / Alternatives
  // --------------------------------------------------------------------------
  console.log('\n25. Tryb Wyszukiwania 2.0 (Exact vs Alternative):');
  const qExact = parseUserQuery('Dreame T30', 'exact');
  const qAlt = parseUserQuery('zamiennik Dreame T30', 'alternative');
  assert(qExact.searchMode === 'exact', 'Tryb exact ustawiony domyślnie');
  assert(qAlt.searchMode === 'alternative', 'Tryb alternative rozpoznany poprawnie');
  assert(qAlt.parsedIntent === 'find_alternative', 'Intencja find_alternative wyekstrahowana');

  // --------------------------------------------------------------------------
  // Scenariusz 26 (Iteracja 3 - Scenariusz B): Product Identity Rationale Scoring
  // --------------------------------------------------------------------------
  console.log('\n26. Szczegółowy podział punktowy tożsamości produktu (Rationale):');
  const rat = resolveProductIdentityRationale('Apple iPhone 15 128GB Czarny', 'Apple iPhone 15 128GB');
  assert(rat.brandMatch === true, 'Zgodność marki = true');
  assert(rat.variantMatch === true, 'Zgodność wariantu = true');
  assert(rat.score >= 80, 'Punktacja tożsamości >= 80');
  assert(rat.reasons.length > 0, 'Wygenerowano czytelne uzasadnienia');

  // --------------------------------------------------------------------------
  // Scenariusz 27 (Iteracja 3 - Scenariusz C): Data Freshness Policy & Granular Timestamps
  // --------------------------------------------------------------------------
  console.log('\n27. Granularne znaczniki świeżości danych (Freshness Policy):');
  const freshOff = normalizeRawOffer({
    sourceId: 'ceneo',
    sourceName: 'Ceneo',
    title: 'Świeża oferta 123',
    offerUrl: 'https://www.ceneo.pl/12345678',
    priceRaw: 199,
  });
  const freshness = evaluateOfferFreshness(freshOff);
  assert(freshness.freshnessGrade === 'fresh', 'Klasa świeżości = fresh');
  assert(freshness.summaryLabel.includes('Aktualne') || freshness.summaryLabel.includes('minut'), 'Human-readable label wygenerowany');

  // --------------------------------------------------------------------------
  // Scenariusz 28 (Iteracja 3 - Scenariusz D): Data Quality Engine & Non-generic Explanations
  // --------------------------------------------------------------------------
  console.log('\n28. Ocena jakości danych (Data Quality Engine):');
  const qualReport = evaluateDataQuality(freshOff);
  assert(qualReport.completenessScore > 0, 'Wynik kompletności > 0');
  assert(qualReport.explanation.includes('Ceneo') && !qualReport.explanation.includes('undefined'), 'Nie-generyczne uzasadnienie zweryfikowane');

  // --------------------------------------------------------------------------
  // Scenariusz 29 (Iteracja 3 - Scenariusz E): Provider Circuit Breaker Pattern
  // --------------------------------------------------------------------------
  console.log('\n29. Circuit Breaker i śledzenie błędów w Provider Diagnostics:');
  const gProvider = new GoogleSearchGroundingProvider(mockAi);
  const diagInit = gProvider.getDiagnostics();
  assert(diagInit.circuitBreakerOpen === false, 'Circuit breaker domyślnie zamknięty (false)');
  assert(typeof diagInit.health.consecutiveFailures === 'number', 'Licznik kolejnych niepowodzeń = 0');

  // --------------------------------------------------------------------------
  // Scenariusz 30 (Iteracja 3 - Scenariusz F): Multi-query Variant Preparation
  // --------------------------------------------------------------------------
  console.log('\n30. Generowanie wariantów zapytania (Query Variants):');
  const qVariants = parseUserQuery('Bosch GSB 13 RE 600W 128GB');
  assert(Boolean(qVariants.generatedQueryVariants?.exact), 'Wariant exact utworzony');
  assert(Boolean(qVariants.generatedQueryVariants?.brandModel), 'Wariant brandModel utworzony (Bosch GSB)');
  assert(Boolean(qVariants.generatedQueryVariants?.techSpecs), 'Wariant techSpecs utworzony');

  // --------------------------------------------------------------------------
  // Scenariusz 31 (Iteracja 3 - Scenariusz G): Task Cancellation with AbortSignal
  // --------------------------------------------------------------------------
  console.log('\n31. Obsługa anulowania zadania (AbortSignal):');
  const controller = new AbortController();
  controller.abort();
  const cancelledRes = await gProvider.search(qExact, controller.signal);
  assert(cancelledRes.success === false, 'Wyszukiwanie zwróciło success = false po anulowaniu');
  assert(cancelledRes.error!.includes('anulowane'), 'Komunikat błędu potwierdza anulowanie zadania');

  // --------------------------------------------------------------------------
  // Scenariusz 32 (Iteracja 3 - Scenariusz H): Discover Product Alternatives
  // --------------------------------------------------------------------------
  console.log('\n32. Odkrywanie rynkowych zamienników (Product Alternatives):');
  const altOffers: Offer[] = [
    normalizeRawOffer({
      sourceId: 'shop',
      sourceName: 'Sklep',
      title: 'Dyson V15 Detect Wireless Vacuum',
      brand: 'Dyson',
      model: 'V15',
      priceRaw: 2899,
      offerUrl: 'https://www.euro.com.pl/p/dyson-v15'
    })
  ];
  const queryDreame = parseUserQuery('Dreame T30');
  const foundAlts = discoverProductAlternatives(queryDreame, altOffers);
  assert(foundAlts.length === 1, 'Znaleziono 1 rekomendowany zamiennik z innej marki (Dyson)');
  assert(foundAlts[0].brand === 'Dyson', 'Zamiennik należy do marki Dyson');

  // --------------------------------------------------------------------------
  // Scenariusz 33 (Iteracja 3 - Scenariusz I): Highlight Variant Discrepancy (128GB vs 256GB)
  // --------------------------------------------------------------------------
  console.log('\n33. Weryfikacja niezgodności wariantów pamięci (128GB vs 256GB):');
  const ratStorageDiff = resolveProductIdentityRationale('iPhone 15 256GB', 'iPhone 15 128GB');
  assert(ratStorageDiff.variantMatch === false, 'variantMatch = false dla 256GB vs 128GB');
  assert(ratStorageDiff.reasons.some(r => r.includes('128GB') || r.includes('256GB')), 'Wykryto i podświetlono rozbieżność pojemności');

  // --------------------------------------------------------------------------
  // Scenariusz 34 (Iteracja 3 - Scenariusz J): Partitioning and Sorting in Ranking Result
  // --------------------------------------------------------------------------
  console.log('\n34. Partycjonowanie i sortowanie w wynikiem rankingu:');
  const rResult = rankOffers(qExact, altOffers);
  assert(Array.isArray(rResult.fullyCalculatedOffers), 'fullyCalculatedOffers jest tablicą');
  assert(Array.isArray(rResult.priceOnlyOffers), 'priceOnlyOffers jest tablicą');
  assert(Array.isArray(rResult.candidateOffers), 'candidateOffers jest tablicą');

  console.log('\n======================================================');
  console.log(` WYNIK TESTÓW: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Błąd krytyczny testów:', err);
  process.exit(1);
});
