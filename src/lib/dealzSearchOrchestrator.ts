/**
 * DEALZ LIVE SEARCH ORCHESTRATOR — ITERATION 2
 * Fully repaired orchestrator:
 * - ZERO fake/placeholder offers injected when no products found.
 * - Marketplace search links returned strictly as MarketplaceSearchLink, NEVER masquerading as Offer objects.
 * - No blind attribution of first Google link to arbitrary items.
 * - Strict error handling without hallucinated fallbacks when Google Search is unavailable.
 */

import { GoogleGenAI } from '@google/genai';
import {
  DealzRankingResult,
  MarketplaceSearchLink,
  SearchQuery,
  Offer
} from '../types/dealz.js';
import {
  parseUserQuery,
  rankOffers
} from './dealzEngines.js';
import { ProviderRegistry } from './dealzProviders.js';

export function buildMarketplaceSearchLinks(query: string): MarketplaceSearchLink[] {
  const enc = encodeURIComponent(query.trim());
  const dashEnc = encodeURIComponent(query.trim()).replace(/%20/g, '-');

  return [
    {
      platform: 'Allegro',
      url: `https://allegro.pl/listing?string=${enc}&order=p`,
      label: 'Sprawdź oferty na Allegro (od najniższej ceny)',
      type: 'marketplace_search',
    },
    {
      platform: 'OLX',
      url: `https://www.olx.pl/oferty/q-${dashEnc}/?search%5Border%5D=filter_float_price%3Aasc`,
      label: 'Sprawdź ogłoszenia na OLX (z Przesyłką OLX)',
      type: 'marketplace_search',
    },
    {
      platform: 'Ceneo',
      url: `https://www.ceneo.pl/;szukaj-${enc}`,
      label: 'Porównaj sklepy na Ceneo.pl',
      type: 'marketplace_search',
    },
    {
      platform: 'Amazon',
      url: `https://www.amazon.pl/s?k=${enc}&s=price-asc-rank`,
      label: 'Szukaj na Amazon.pl Prime',
      type: 'marketplace_search',
    },
  ];
}

export async function executeUniversalSearch(
  ai: GoogleGenAI,
  rawQuery: string,
  targetPrice?: number | null
): Promise<DealzRankingResult> {
  const parsedQuery = parseUserQuery(rawQuery);
  const searchLinks = buildMarketplaceSearchLinks(parsedQuery.rawQuery);

  // Initialize Provider Registry
  const registry = new ProviderRegistry(ai);

  // Execute providers
  const { offers, diagnostics, errors, sourcesQueried, sourcesSucceeded, sourcesFailed } =
    await registry.executeAll(parsedQuery);

  // Rank offers (strictly partitioned: TotalCost known, Price only, Candidates)
  const ranking = rankOffers(parsedQuery, offers, searchLinks, offers.length);

  // Attach diagnostic provenance
  ranking.provenance = {
    sourcesQueried,
    sourcesSucceeded,
    sourcesFailed,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  ranking.diagnostics.providers = diagnostics;

  // AI Market Insight based strictly on factual observations
  const obsCount = ranking.priceStats.observationsCount;
  if (obsCount > 0) {
    const med = ranking.priceStats.medianPrice;
    const min = ranking.priceStats.minPrice;
    const max = ranking.priceStats.maxPrice;

    let verdict: 'BIERZ TERAZ' | 'NEGOCJUJ' | 'CZEKAJ' | 'ODRADZAM' = 'CZEKAJ';
    let verdictReason = `Zidentyfikowano ${obsCount} ofert z ceną (mediana: ${med} PLN, zakres: ${min} - ${max} PLN).`;

    if (targetPrice && targetPrice > 0 && med) {
      if (targetPrice < med * 0.85) {
        verdict = 'BIERZ TERAZ';
        verdictReason = `Cena referencyjna ${targetPrice} PLN jest o ${Math.round(med - targetPrice)} PLN niższa od mediany rynkowej (${med} PLN).`;
      } else if (targetPrice > med * 1.15) {
        verdict = 'ODRADZAM';
        verdictReason = `Cena referencyjna ${targetPrice} PLN przewyższa medianę rynkową (${med} PLN). Dostępne są tańsze opcje.`;
      } else {
        verdict = 'NEGOCJUJ';
        verdictReason = `Cena referencyjna mieści się w standardowym paśmie rynkowym (mediana ${med} PLN). Warto podjąć próbę negocjacji.`;
      }
    }

    ranking.aiInsight = {
      summary: `Raport rynkowy dla "${parsedQuery.rawQuery}": znaleziono ${offers.length} ofert, w tym ${ranking.diagnostics.fullyVerifiedCount} w pełni zweryfikowanych.`,
      verdict,
      verdictReason,
      cautionNotes: [
        'Zawsze weryfikuj stan techniczny, dowód zakupu oraz program ochrony kupujących przed finalizacją transakcji.',
        'W przypadku cen bez potwierdzonego kosztu dostawy ostateczny koszt zakupu może ulec zmianie.'
      ],
      variantDifferences: [],
    };
  } else if (errors.length > 0) {
    ranking.aiInsight = {
      summary: 'Błąd połączenia ze źródłami zewnętrznymi.',
      verdict: 'CZEKAJ',
      verdictReason: `Nie udało się pobrać aktualnych cen: ${errors[0]}`,
      cautionNotes: ['Sprawdź połączenie sieciowe lub skorzystaj z bezpośrednich linków do wyszukiwarek poniżej.'],
    };
  } else {
    ranking.aiInsight = {
      summary: `Brak aktywnych ofert dla zapytania "${parsedQuery.rawQuery}".`,
      verdict: 'CZEKAJ',
      verdictReason: 'Żaden ze zweryfikowanych partnerów nie zwrócił aktualnej oferty dla tego przedmiotu.',
      cautionNotes: ['Spróbuj doprecyzować model, sprawdzić pisownię lub kliknąć linki bezpośrednie do platform.'],
    };
  }

  return ranking;
}
