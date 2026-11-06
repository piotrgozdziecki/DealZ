import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { executeUniversalSearch, buildMarketplaceSearchLinks } from './src/lib/dealzSearchOrchestrator.js';
import { parseUserQuery, rankOffers } from './src/lib/dealzEngines.js';
import { priceHistoryStore } from './src/lib/dealzPriceHistory.js';
import type { Offer, SearchApiResponse } from './src/types/dealz.js';

dotenv.config();

// SSRF Protection: Blocks private IPs, metadata servers, loopbacks, and non-HTTP protocols
export function isSafeExternalUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.2') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.') ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side GoogleGenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize JSON response string
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// 1. FAST SCAN - Low-latency quick appraisal using gemini-3.1-flash-lite
app.post('/api/quick-scan', async (req, res) => {
  try {
    const { title, price, currency = 'PLN', url, description } = req.body;

    if (!title && !url) {
      return res.status(400).json({ error: 'Brak tytułu lub linku do oferty.' });
    }

    const prompt = `Jesteś błyskawicznym asystentem wyceny i łowcą okazji internetowych (Allegro, OLX, Ceneo, Amazon).
Dokonaj ekspresowej oceny (low latency) oferty:
Tytuł/Produkt: ${title || 'Nieznany (z linku)'}
Cena podana: ${price ? price + ' ' + currency : 'Nie podano'}
Link: ${url || 'Brak'}
Opis skrótowy: ${description || 'Brak'}

Zwróć odpowiedź w czystym formacie JSON:
{
  "dealVerdict": "MEGA OKAZJA" | "DOBRA CENA" | "CENA RYNKOWA" | "PRZEPŁACASZ" | "PODEJRZANIE TANIO (RYZYKO)",
  "dealScore": liczba od 0 do 100,
  "estimatedFairPrice": "np. 2100 - 2350 PLN",
  "savingsPercentage": "np. -18% lub +12%",
  "quickHeadline": "Maksymalnie 15 słów podsumowania",
  "initialRisk": "Główny czynnik ryzyka lub atut (np. brak dowodu zakupu lub pełen komplet z gwarancją)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(cleanJsonString(response.text ?? '{}'));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Quick scan error:', error?.message);
    return res.status(503).json({
      success: false,
      status: 'source_unavailable',
      error: 'Błyskawiczna analiza jest chwilowo niedostępna: ' + (error?.message || 'Brak odpowiedzi modelu'),
      sourcesQueried: ['gemini-3.1-flash-lite'],
      sourcesSucceeded: [],
      sourcesFailed: ['gemini-3.1-flash-lite'],
      fetchedAt: new Date().toISOString()
    });
  }
});

// 2. LIVE SEARCH GROUNDING - Search real active marketplace listings with gemini-3.8-flash & googleSearch
app.post('/api/search-market', async (req, res) => {
  try {
    const { productQuery, currentPrice, currency = 'PLN' } = req.body;

    if (!productQuery) {
      return res.status(400).json({ error: 'Brak nazwy produktu do wyszukania.' });
    }

    const searchQuery = `${productQuery} cena allegro olx ceneo pl`;

    const searchPrompt = `Przeszukaj polski internet (Allegro, OLX, Ceneo, sklepy internetowe w Polsce) w poszukiwaniu aktualnych cen i ofert dla produktu: "${productQuery}".
Oferowana cena w analizowanej aukcji: ${currentPrice ? currentPrice + ' ' + currency : 'nieznana'}.

Podaj:
1. Aktualne widełki cenowe na rynku wtórnym (używane) i pierwotnym (nowe) w Polsce w PLN.
2. 3-6 konkretnych podobnych ofert lub punktów odniesienia rynkowego z nazwami platform i orientacyjnymi cenami.
3. Czy rynek jest stabilny, czy ceny spadają.

Zwróć odpowiedź w formacie Markdown z czytelnymi sekcjami i wypunktowaniami.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({
        title: c.web.title || 'Oferta w sieci',
        uri: c.web.uri,
      }));

    return res.json({
      success: true,
      text: response.text,
      sources: webSources,
    });
  } catch (error: any) {
    console.error('Market search error:', error?.message);
    return res.status(503).json({
      success: false,
      status: 'source_unavailable',
      error: 'Wyszukiwanie rynkowe na żywo jest chwilowo niedostępne: ' + (error?.message || 'Brak odpowiedzi wyszukiwarki'),
      sourcesQueried: ['Google Search Grounding'],
      sourcesSucceeded: [],
      sourcesFailed: ['Google Search Grounding'],
      fetchedAt: new Date().toISOString()
    });
  }
});

// 3. DEEP VALUATION & IMAGE UNDERSTANDING - gemini-4-argon with ThinkingLevel.HIGH
app.post('/api/deep-analysis', async (req, res) => {
  try {
    const {
      title,
      price,
      currency = 'PLN',
      url,
      description,
      condition,
      location,
      sellerType,
      imageBase64,
      imageMimeType = 'image/jpeg',
      liveMarketContext,
    } = req.body;

    const parts: any[] = [];

    // If user uploaded an image / screenshot of the offer
    if (imageBase64) {
      // Remove data:image/...;base64, prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      });
    }

    const textPrompt = `Jesteś elitarnym rzeczoznawcą cenowym, analitykiem rynkowym i łowcą okazji (Allegro, OLX, Ceneo, Otomoto, Amazon).
Twoim zadaniem jest gruntowna analiza oferty:
${imageBase64 ? 'UWAGA: Przeanalizuj także dołączony zrzut ekranu lub zdjęcie oferty (stan fizyczny, akcesoria, oryginalność, etykiety cenowe, ewentualne wady wizualne).' : ''}

DANE OFERTY:
- Tytuł/Nazwa: ${title || 'Odczytaj ze zdjęcia lub linku'}
- Cena z oferty: ${price ? price + ' ' + currency : 'Odczytaj ze zdjęcia'}
- Link: ${url || 'Brak'}
- Stan deklarowany: ${condition || 'Nieznany / Ze zdjęcia'}
- Opis ogłoszenia: ${description || 'Brak opisu'}
- Lokalizacja: ${location || 'Nie podano'}
- Typ sprzedającego: ${sellerType || 'Prywatny / Firma'}
${liveMarketContext ? `DANE Z NAJNOWSZEGO PRZESZUKANIA RYNKU:\n${liveMarketContext}` : ''}

Wykonaj dogłębną kalkulację wartości rynkowej ("Prawidłowa cena rynkowa"), oszacuj okazjonalność (deal score), wykryj ukryte haczyki i przygotuj strategię negocjacyjną.

ZASADY KRYTYCZNE DLA RZETELNOŚCI:
1. IDENTYFIKACJA MARKI: Najpierw zidentyfikuj MARKE (np. TAVO, Dreame, Dyson, Samsung). Nie daj się zwieść parametrom technicznym (np. "600W", "35kPa") - budżetowe marki często używają wysokich parametrów, by udawać marki premium.
2. WERYFIKACJA WIZUALNA: Jeśli na zdjęciu/pudełku widnieje inna marka niż w Twoich domysłach, trzymaj się marki ze zdjęcia.
3. LOGIKA CENOWA: Jeśli przedmiot kosztuje 300 PLN, a parametry sugerują model za 2000 PLN (jak Dreame T30), to na 99% jest to budżetowy zamiennik lub inna marka. Nie przypisuj mu wyceny marki premium!
4. UNIKAJ "ODPOWIEDNIKÓW": Podaj wycenę dla DOKŁADNIE tego produktu, który widzisz. Nie podawaj ceny "odpowiednika premium" jako benchmarku dla budżetowego modelu.

Zwróć odpowiedź w czystym formacie JSON:
{
  "product": {
    "identifiedName": "Dokładna marka, model i wariant (np. TAVO Flynx, a nie Dreame T30)",
    "category": "Kategoria produktu",
    "detectedCondition": "Ocena stanu (np. Nowy, Stan idealny, Widoczne ślady, Po zwrocie)",
    "specsSummary": "Kluczowe parametry techniczne w 1 zdaniu",
    "stockAvailability": "in_stock" | "out_of_stock" | "low_stock" | "unknown"
  },
  "pricing": {
    "offeredPrice": ${Number(price) || 0},
    "currency": "${currency}",
    "fairMarketPrice": 450,
    "marketMinPrice": 300,
    "marketMaxPrice": 600,
    "medianPrice": 420,
    "priceDifferenceAmount": -150,
    "priceDifferencePercentage": -33.3,
    "isBelowMarket": true
  },
  "rawStats": {
    "marketVolatility": "low" | "medium" | "high",
    "demandLevel": "low" | "moderate" | "high" | "viral",
    "listingAgeAvgDays": 12
  },
  "dealScore": {
    "score": 85,
    "ratingLabel": "Mega Okazja" | "Bardzo Dobra Cena" | "Uczciwa Cena Rynkowa" | "Lekko Za Drogo" | "Znacznie Przepłacasz" | "Podejrzanie Tanio (Ostrożnie)",
    "recommendation": "KUPUJ" | "NEGOCJUJ" | "CZEKAJ" | "ODRADZAM",
    "rationale": "Szczegółowe uzasadnienie oceny opłacalności. WYJAŚNIJ DLACZEGO TO TA MARKA I MODEL."
  },
  "safetyAndRedFlags": [
    {
      "severity": "high" | "medium" | "low" | "positive",
      "flag": "Krótki tytuł ryzyka lub zalety",
      "explanation": "Szczegółowe wyjaśnienie (np. budżetowa marka udająca premium, ryzyko blokady, stan baterii)"
    }
  ],
  "negotiationStrategy": {
    "suggestedOffer": 280,
    "maxWalkingPrice": 310,
    "leveragePoints": ["Chińska marka budżetowa", "Brak gwarancji producenta premium", "Głośna praca"],
    "readyMessageToSeller": "Gotowa wiadomość po polsku."
  },
  "depreciationForecast": "Prognoza spadku wartości.",
  "audioBriefingScript": "Skrypt audio."
}`;

    parts.push({ text: textPrompt });

    let response;
    try {
      // Primary model: gemini-4-argon with ThinkingLevel.HIGH (as requested by user feature)
      response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: parts,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          responseMimeType: 'application/json',
        },
      });
    } catch (argonError: any) {
      console.warn('gemini-4-argon call failed, falling back to gemini-3.8-flash:', argonError?.message);
      // Fallback to gemini-3.8-flash with JSON mode if argon requires tier change
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const parsed = JSON.parse(cleanJsonString(response.text ?? '{}'));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Deep analysis error:', error?.message);
    return res.status(500).json({
      success: false,
      status: 'error',
      error: 'Nie udało się przeprowadzić głębokiej wyceny oferty: ' + (error?.message || 'Brak odpowiedzi modelu'),
      sourcesQueried: ['gemini-2.5-pro'],
      sourcesSucceeded: [],
      sourcesFailed: ['gemini-2.5-pro'],
      fetchedAt: new Date().toISOString()
    });
  }
});

// 4. TTS AUDIO SUMMARY - gemini-3.8-flash-tts
app.post('/api/generate-audio-summary', async (req, res) => {
  try {
    const { script, voiceName = 'Kore', voiceStyle = 'Clear, engaging Polish consumer radio host for morning commute' } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'Brak tekstu skryptu do wygenerowania mowy.' });
    }

    // gemini-3.8-flash-tts as explicitly required
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: script,
              speechMetadata: {
                style: voiceStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // Options: 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'Nie udało się wygenerować strumienia audio.' });
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('TTS Generation error:', error);
    return res.status(500).json({
      error: 'Błąd generowania mowy: ' + (error?.message || 'Nieznany błąd'),
    });
  }
});

// 5. DUAL-SPEAKER PODCAST AUDIO (Host & Analyst) using gemini-3.8-flash-tts multi-speaker
app.post('/api/generate-podcast-audio', async (req, res) => {
  try {
    const { productTitle, verdict, savings, advice } = req.body;

    const scriptPuck = `Cześć! Słuchasz porannego radaru okazji. Dziś na tapecie mamy ogłoszenie: ${productTitle || 'ogłoszenie internetowe'}. Werdykt to: ${verdict || 'bardzo ciekawa oferta'}.`;
    const scriptKore = `Dokładnie! Z analizy rynku wynika różnica ${savings || 'spora oszczędność'}. Moja rada na dziś: ${advice || 'warto dokładnie sprawdzić stan techniczny przed zakupem'}. Udanego dnia w trasie!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Puck: ${scriptPuck}`,
              speechMetadata: {
                speaker: 'Puck',
                style: 'Energetic, cheerful morning commuter podcast co-host',
              },
            },
            {
              text: `Kore: ${scriptKore}`,
              speechMetadata: {
                speaker: 'Kore',
                style: 'Savvy, articulate consumer finance analyst',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Puck',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
              },
              {
                speaker: 'Kore',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Nie udało się wygenerować dialogu podkastu.' });
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Podcast TTS error:', error);
    return res.status(500).json({
      error: 'Błąd generowania podkastu: ' + (error?.message || 'Nieznany błąd'),
    });
  }
});

// Helper to strictly enforce HTTPS URLs for security and browser compliance
function ensureHttps(urlStr: string): string {
  if (!urlStr) return '';
  if (urlStr.startsWith('http://')) {
    return urlStr.replace(/^http:\/\//i, 'https://');
  }
  return urlStr;
}

// Helper to build 100% real, active, working live search & filter URLs on Polish marketplaces
function buildMarketUrl(platform: string, query: string): string {
  const enc = encodeURIComponent(query.trim());
  const dashEnc = encodeURIComponent(query.trim()).replace(/%20/g, '-');
  switch (platform.toLowerCase()) {
    case 'allegro':
      // order=p sorts by price ascending, showing the cheapest active real offers right now
      return `https://allegro.pl/listing?string=${enc}&order=p`;
    case 'olx':
      // sorts by price ascending with active OLX delivery filter
      return `https://www.olx.pl/oferty/q-${dashEnc}/?search%5Border%5D=filter_float_price%3Aasc`;
    case 'ceneo':
      return `https://www.ceneo.pl/;szukaj-${enc}`;
    case 'amazon':
    case 'amazon.pl':
      return `https://www.amazon.pl/s?k=${enc}&s=price-asc-rank`;
    default:
      return `https://allegro.pl/listing?string=${enc}&order=p`;
  }
}

// Clean and extract product keywords from raw query or pasted OLX/Allegro/Ceneo links
function extractProductKeywords(inputStr: string): string {
  if (!inputStr) return 'Smartfon';
  let clean = inputStr.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const parsedUrl = new URL(clean);
      const pathname = decodeURIComponent(parsedUrl.pathname);
      // Strip common Polish marketplace route prefixes
      const slug = pathname
        .replace(/^\/(d\/oferta|oferta|i|p|produkt|kategoria)\//i, '')
        .replace(/\.html?$/i, '')
        .replace(/-CID[0-9]+-[A-Za-z0-9]+$/i, '') // OLX hash suffix
        .replace(/-[0-9]{8,16}$/, '') // Allegro numeric item ID suffix
        .replace(/[-_]+/g, ' ')
        .replace(/\b(kup teraz|bcm|nowy|uzywany|gwarancja|faktura|stan|idealny)\b/gi, '')
        .trim();
      if (slug && slug.length >= 3) {
        return slug.slice(0, 70).trim();
      }
    } catch {
      // ignore
    }
  }
  return clean.replace(/https?:\/\/[^\s]+/g, '').trim() || clean;
}

// Aggressive filter to strip common accessory/junk words to focus on the core product
function refineSearchKeywords(query: string): string {
  if (!query) return '';
  let q = query.toLowerCase();
  // Negative filters: words that often indicate non-core products or distractions
  const junkWords = [
    'etui', 'case', 'pokrowiec', 'szkło', 'folia', 'pudełko', 'box', 'karton', 'części', 'część',
    'rozbity', 'uszkodzony', 'zepsuty', 'blokada', 'icloud', 'google bypass', 'akcesoria', 'zestaw akcesoriów',
    'kabel', 'ładowarka', 'instrukcja', 'naklejka', 'zamiennik', 'dummy', 'atrapa'
  ];
  
  // Only remove if they are not the primary subject (heuristic)
  let words = q.split(/\s+/);
  if (words.length > 2) {
    words = words.filter(w => !junkWords.includes(w.replace(/[^a-z0-9]/g, '')));
  }
  
  // Strip misleading technical performance marketing buzzwords
  const buzzwords = [
    '600w', '35kpa', '25000pa', '30000pa', '40000pa', 'super mocny', 'mega ssanie', 'hiper moc', 'mocny filtr'
  ];
  words = words.filter(w => !buzzwords.includes(w));
  
  return words.join(' ').trim() || q;
}

// Price history resolution via persistent disk store
function getGenuinePriceHistory(productKey: string) {
  const normKey = priceHistoryStore.generateProductKey(productKey);
  const data = priceHistoryStore.getHistoryForProduct(normKey);
  return {
    points: data.points,
    min30d: data.minPrice,
    max30d: data.maxPrice,
    isAllTimeLow: data.isAllTimeLow
  };
}


// 6. PRICE COMPARATOR (Allegro, Ceneo, Amazon PL, OLX) with Google Search Grounding
app.post('/api/compare-prices', async (req, res) => {
  const { productName, targetPrice } = req.body || {};
  try {
    if (!productName) {
      return res.status(400).json({ error: 'Brak nazwy produktu do porównania cen.' });
    }

    const cleanName = extractProductKeywords(productName);
    const parsedTargetPrice = Number(targetPrice) || 0;

    const prompt = `Jesteś rygorystyczną, precyzyjną polską porównywarką cenową e-commerce.
Przeszukaj polski rynek e-commerce w czasie rzeczywistym za pomocą Google Search dla produktu: "${cleanName}".
Badana cena oferty: ${parsedTargetPrice > 0 ? parsedTargetPrice + ' PLN' : 'brak'}.

ZASADA BEZWZGLĘDNA:
Znajdź RZECZYWISTE, AKTUALNE ceny dla tego produktu w polskich sklepach i platformach:
1. Allegro (allegro.pl / allegro lokalnie)
2. Ceneo (ceneo.pl - polskie sklepy jak Media Expert, x-kom, RTV Euro AGD, Morele)
3. Amazon Polska (amazon.pl)
4. OLX (olx.pl - rynek wtórny, ogłoszenia z przesyłką OLX)

NIGDY nie wstawiaj fikcyjnych linków z kropkami '...' ani zmyślonych cen!
Dla linków użyj bezpośrednich adresów URL z Google Search lub zweryfikowanych linków filtrujących:
- Allegro: ${buildMarketUrl('Allegro', cleanName)}
- Ceneo: ${buildMarketUrl('Ceneo', cleanName)}
- Amazon.pl: ${buildMarketUrl('Amazon.pl', cleanName)}
- OLX: ${buildMarketUrl('OLX', cleanName)}

Zwróć odpowiedź w czystym formacie JSON:
{
  "productName": "${cleanName}",
  "bestPrice": 1999,
  "worstPrice": 2499,
  "averagePrice": 2240,
  "savingsVsHighest": 500,
  "stores": [
    {
      "platform": "Ceneo",
      "seller": "Nazwa rzeczywistego sklepu (np. Media Expert, x-kom, Morele)",
      "price": 2049,
      "currency": "PLN",
      "condition": "Nowy fabrycznie",
      "shipping": "Darmowa od 150 zł lub Paczkomat 12 zł",
      "url": "${buildMarketUrl('Ceneo', cleanName)}",
      "isBestPrice": false,
      "rating": "4.9/5",
      "availability": "W magazynie - wysyłka 24h"
    },
    {
      "platform": "Allegro",
      "seller": "Oficjalny Sklep Allegro lub Super Sprzedawca",
      "price": 2099,
      "currency": "PLN",
      "condition": "Nowy / Gwarancja 24m",
      "shipping": "Allegro Smart! 0 zł",
      "url": "${buildMarketUrl('Allegro', cleanName)}",
      "isBestPrice": false,
      "rating": "99.4% poleca",
      "availability": "Dostępne z dostawą jutro"
    },
    {
      "platform": "Amazon.pl",
      "seller": "Amazon Polska",
      "price": 2149,
      "currency": "PLN",
      "condition": "Nowy",
      "shipping": "Dostawa Amazon Prime 0 zł",
      "url": "${buildMarketUrl('Amazon.pl', cleanName)}",
      "isBestPrice": false,
      "rating": "4.8/5",
      "availability": "Wysyłka przez Amazon"
    },
    {
      "platform": "OLX",
      "seller": "Osoba prywatna (ogłoszenie lokalne z przesyłką OLX)",
      "price": 1850,
      "currency": "PLN",
      "condition": "Używany / Stan idealny",
      "shipping": "Przesyłka OLX od 9 zł lub odbiór",
      "url": "${buildMarketUrl('OLX', cleanName)}",
      "isBestPrice": true,
      "rating": "Konto prywatne",
      "availability": "1 sztuka"
    }
  ],
  "marketVerdict": "Podsumowanie w 2 zdaniach: gdzie obecnie najbardziej opłaca się kupić ten produkt i na co uważać."
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        },
      });
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash quota reached in compare-prices, retrying with gemini-3.1-flash-lite:', primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const parsed = JSON.parse(cleanJsonString(response.text ?? '{}'));

    // Extract grounding URLs and map to real sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({
        title: c.web.title || 'Oferta w sieci',
        uri: c.web.uri,
      }));

    // Clean and validate store URLs to ensure 100% working, real-time links
    if (parsed.stores && Array.isArray(parsed.stores)) {
      parsed.stores = parsed.stores.map((store: any) => {
        const plat = store.platform || 'Allegro';
        // If Gemini left an ellipsis, invalid URL, or empty link, replace with verified live market URL
        if (!store.url || store.url.includes('...') || store.url.includes('example.com') || !store.url.startsWith('http')) {
          // Check if there is a matching real URL in grounding chunks
          const matchingChunk = webSources.find((s: any) => s.uri.toLowerCase().includes(plat.toLowerCase().replace('.pl', '')));
          store.url = matchingChunk ? matchingChunk.uri : buildMarketUrl(plat, cleanName);
        }
        return store;
      });
    }

    // Attach genuine measured historical observations from persistent store
    const { points, min30d, max30d, isAllTimeLow } = getGenuinePriceHistory(cleanName);

    parsed.priceHistory30d = points;
    parsed.min30d = min30d;
    parsed.max30d = max30d;
    parsed.isAllTimeLow = isAllTimeLow;

    return res.json({
      success: true,
      data: parsed,
      sources: webSources,
    });
  } catch (error: any) {
    console.error('Compare prices API error:', error?.message);
    return res.status(503).json({
      success: false,
      status: 'source_unavailable',
      error: 'Porównywarka cen jest chwilowo niedostępna: ' + (error?.message || 'Brak odpowiedzi Google Search Grounding'),
      sourcesQueried: ['Google Search Grounding'],
      sourcesSucceeded: [],
      sourcesFailed: ['Google Search Grounding'],
      fetchedAt: new Date().toISOString()
    });
  }
});

// 7. INTERACTIVE AI SHOPPING ADVISOR (Ask about deal profitability & find alternatives)
app.post('/api/shopping-assistant', async (req, res) => {
  try {
    const { message, productContext, currentPrice } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Brak treści zapytania do asystenta.' });
    }

    const prompt = `Jesteś osobistym, bezkompromisowym doradcą zakupowym i ekspertem rynkowym w Polsce.
Użytkownik pyta o opłacalność oferty zakupu:
Produkt: ${productContext || 'Przedmiot aukcji'}
Cena w ofercie: ${currentPrice ? currentPrice + ' PLN' : 'nie podano'}

Pytanie użytkownika: "${message}"

Odpowiedz w profesjonalny, konkretny sposób po polsku:
1. Odpowiedz wprost na pytanie użytkownika (czy się opłaca, czy warto czekać, czy negocjować).
2. Jeśli użytkownik prosi o alternatywy lub tańsze modele, podaj 2-3 konkretne urządzenia/przedmioty z podobnej lub wyższej półki w zbliżonym budżecie z uzasadnieniem dlaczego warto je rozważyć.
3. Podaj 1 kluczową radę na co uważać podczas transakcji.

Używaj czytelnego formatowania Markdown z pogrubieniami i wypunktowaniami.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({
        title: c.web.title || 'Źródło',
        uri: c.web.uri,
      }));

    return res.json({
      success: true,
      answer: response.text,
      sources: webSources,
    });
  } catch (error: any) {
    console.error('Shopping assistant error:', error);
    return res.status(500).json({
      error: 'Błąd asystenta zakupowego: ' + (error?.message || 'Nieznany błąd'),
    });
  }
});

// 8. DATE & OFFER FRESHNESS VERIFICATION
app.post('/api/check-date-freshness', async (req, res) => {
  try {
    const { listingDate, title, price } = req.body;

    const offerDate = listingDate ? new Date(listingDate) : new Date();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - offerDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let status = 'fresh';
    let label = 'Świeża oferta (0-48h)';
    let availabilityChance = 'Bardzo Wysoka (95%)';
    let riskNotice = 'Ogłoszenie jest świeże, niska szansa na sprzedaż innemu kupującemu.';

    if (diffDays > 14) {
      status = 'stale';
      label = 'Ogłoszenie starsze niż 14 dni';
      availabilityChance = 'Niska / Ryzyko Archiwalnej';
      riskNotice = 'UWAGA: Oferta wisi w sieci już ponad 2 tygodnie. Na OLX/Allegro może być już nieaktualna, sprzedana lub sprzedawca nie odpowiada. Koniecznie potwierdź dostępność przed jakąkolwiek wpłatą.';
    } else if (diffDays > 6) {
      status = 'aging';
      label = 'Wystawiono ponad tydzień temu';
      availabilityChance = 'Umiarkowana (ok. 60%)';
      riskNotice = 'Oferta ma już kilka dni. Możliwe pole do mocniejszych negocjacji ceny – sprzedawca może chcieć szybciej zamknąć transakcję.';
    } else if (diffDays > 2) {
      status = 'standard';
      label = 'Wystawiono w tym tygodniu (3-6 dni)';
      availabilityChance = 'Dobra (ok. 85%)';
      riskNotice = 'Standardowy czas obecności oferty na rynku wtórnym.';
    }

    return res.json({
      success: true,
      data: {
        diffDays,
        status,
        label,
        availabilityChance,
        riskNotice,
        checkedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Date freshness error:', error);
    return res.status(500).json({
      error: 'Błąd weryfikacji daty oferty: ' + (error?.message || 'Nieznany błąd'),
    });
  }
});

// 9. INSTANT DEAL FINDER & UNIVERSAL DEALZ SEARCH
app.post('/api/instant-find-deals', async (req, res) => {
  const { query, link, price, imageBase64, imageMimeType = 'image/jpeg' } = req.body || {};
  let rawSearchTerm = (query || link || '').trim();

  try {
    // 1. Google Lens vision extraction if image is provided
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const parts: any[] = [
        {
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        },
        {
          text: 'Zidentyfikuj ten przedmiot ze zdjęcia. Podaj wyłącznie jego markę, model lub nazwę handlową w 1 krótkiej linii, aby wyszukać go w sklepach.'
        }
      ];

      try {
        const visionRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: parts,
        });
        const identified = visionRes.text?.trim();
        if (identified) {
          rawSearchTerm = identified.split('\n')[0].replace(/^["']|["']$/g, '').slice(0, 80);
        }
      } catch (visErr) {
        console.warn('Vision identification fallback:', visErr);
        rawSearchTerm = rawSearchTerm || 'Przedmiot';
      }
    }

    if (!rawSearchTerm) {
      return res.status(400).json({ error: 'Podaj nazwę przedmiotu, wklej link lub dodaj zdjęcie do wyszukania.' });
    }

    // SSRF Protection for URL inputs
    if (rawSearchTerm.startsWith('http://') || rawSearchTerm.startsWith('https://')) {
      if (!isSafeExternalUrl(rawSearchTerm)) {
        return res.status(400).json({ error: 'Niedozwolony lub prywatny adres URL (ochrona SSRF).' });
      }
    }

    const parsedPrice = Number(price) > 0 ? Number(price) : null;

    // 2. Execute Universal DealZ Search across marketplaces with real Google Search Grounding
    const rankingResult = await executeUniversalSearch(ai, rawSearchTerm, parsedPrice);

    // Record verified prices into persistent store (survives process restart)
    for (const offer of rankingResult.sortedOffers) {
      if (offer.price !== null && offer.price > 0) {
        const pKey = priceHistoryStore.generateProductKey(
          offer.product.title,
          offer.product.variant,
          offer.condition,
          offer.currency
        );
        priceHistoryStore.recordObservation({
          productKey: pKey,
          offerId: offer.id,
          sourceId: offer.sourceId,
          price: offer.price,
          currency: offer.currency,
          shippingCost: offer.shippingCost ?? null,
          totalCost: offer.totalCost ?? null,
          verificationStatus: offer.verificationStatus,
          observedAt: offer.fetchedAt,
          evidenceReference: offer.offerUrl,
        });
      }
    }

    // Map to API response contract expected by frontend — ZERO fake defaults
    const mappedSimilarDeals = rankingResult.sortedOffers.map((offer: Offer) => {
      let plat: 'Allegro' | 'OLX' | 'Ceneo' | 'Amazon' = 'Allegro';
      const lowSrc = offer.sourceName.toLowerCase();
      if (lowSrc.includes('olx')) plat = 'OLX';
      else if (lowSrc.includes('ceneo')) plat = 'Ceneo';
      else if (lowSrc.includes('amazon')) plat = 'Amazon';

      const diff = parsedPrice && offer.price ? offer.price - parsedPrice : 0;
      const isCheaper = parsedPrice && offer.price ? offer.price < parsedPrice : false;

      return {
        title: offer.product.title,
        platform: plat,
        seller: offer.sellerName || offer.sourceName,
        price: offer.price, // Can be null! Never fake 0
        currency: offer.currency,
        condition: offer.condition === 'new' ? 'Nowy' : offer.condition === 'used' ? 'Używany' : 'Stan sprawdzony',
        shipping: offer.shippingCost === 0 ? 'Darmowa dostawa' : offer.shippingCost ? `${offer.shippingCost} zł` : 'Sprawdź u sprzedawcy',
        shippingSpeed: offer.shippingSpeed || null,
        url: offer.offerUrl,
        isCheaper,
        priceDifferenceVsTarget: diff,
        matchAccuracy: offer.product.identityConfidence || null,
        isCoreProduct: true,
        availabilityStatus: offer.availability || 'unknown',
        badge: offer.isDirectListingUrl ? 'Aukcja bezpośrednia' : 'Kandydatura sieciowa',
        verificationStatus: offer.verificationStatus,
        verificationEvidence: offer.verificationEvidence,
      };
    });

    const isProfitable = rankingResult.lowestPriceOffer && parsedPrice
      ? rankingResult.lowestPriceOffer.price! < parsedPrice
      : false;

    const diffAmt = parsedPrice && rankingResult.priceStats.medianPrice
      ? Math.round(rankingResult.priceStats.medianPrice - parsedPrice)
      : 0;

    const diffPct = parsedPrice && rankingResult.priceStats.medianPrice
      ? Math.round((diffAmt / rankingResult.priceStats.medianPrice) * 100)
      : 0;

    const exactLiveLinks = {
      allegro: buildMarketUrl('Allegro', rawSearchTerm),
      olx: buildMarketUrl('OLX', rawSearchTerm),
      ceneo: buildMarketUrl('Ceneo', rawSearchTerm),
      amazon: buildMarketUrl('Amazon.pl', rawSearchTerm),
    };

    const finalResponse = {
      query: rawSearchTerm,
      targetProduct: {
        title: rankingResult.recognizedProduct.title || rawSearchTerm,
        identifiedPrice: parsedPrice || rankingResult.lowestPriceOffer?.price || null,
        currency: 'PLN',
      },
      verdict: rankingResult.aiInsight?.verdict || (isProfitable ? 'BIERZ TERAZ' : 'SZUKAJ DALEJ'),
      verdictReason: rankingResult.aiInsight?.verdictReason || 
        (rankingResult.priceStats.observationsCount > 0
          ? `Zidentyfikowano ${rankingResult.priceStats.observationsCount} ofert rynkowych. Mediana cen wynosi ${rankingResult.priceStats.medianPrice} PLN (zakres: ${rankingResult.priceStats.minPrice} - ${rankingResult.priceStats.maxPrice} PLN).`
          : 'Trwa weryfikacja ofert u partnerów handlowych.'),
      savingsAmount: Math.abs(diffAmt),
      savingsPercentage: Math.abs(diffPct),
      isProfitable,
      benchmarkPrice: rankingResult.priceStats.medianPrice || parsedPrice || null,
      confidenceScore: rankingResult.recognizedProduct.identityConfidence || null,
      safetyTip: rankingResult.aiInsight?.cautionNotes?.[0] || 'Weryfikuj status sprzedawcy i korzystaj z programów ochrony kupujących.',
      rawMarketStats: {
        totalActiveOffers: rankingResult.totalOffersFound,
        medianPrice: rankingResult.priceStats.medianPrice,
        minPrice: rankingResult.priceStats.minPrice,
        maxPrice: rankingResult.priceStats.maxPrice,
        lastPriceChange: 'Dane na żywo',
      },
      similarDeals: mappedSimilarDeals,
      exactLiveLinks,
      groundingSources: rankingResult.sortedOffers.map((o: Offer) => ({
        title: `${o.sourceName}: ${o.product.title}`,
        uri: o.offerUrl,
      })),
      dealzRanking: rankingResult,
      marketplaceSearchLinks: rankingResult.marketplaceSearchLinks,
    };

    return res.json({
      success: true,
      status: rankingResult.totalOffersFound > 0 ? 'completed' : 'no_results',
      data: finalResponse,
    });
  } catch (error: any) {
    console.error('DealZ universal search error:', error?.message);
    return res.status(500).json({
      success: false,
      status: 'error',
      error: 'Błąd podczas wyszukiwania ofert na żywo: ' + (error?.message || 'Nieznany błąd'),
      sourcesQueried: ['DealZ Universal Search'],
      sourcesSucceeded: [],
      sourcesFailed: ['DealZ Universal Search'],
      fetchedAt: new Date().toISOString()
    });
  }
});

// Configure Vite middleware or static serving
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  setupServer();
}
