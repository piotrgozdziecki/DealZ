import { OfferInput } from '../types';

export interface SampleOffer {
  id: string;
  badge: string;
  badgeColor: string;
  name: string;
  platform: 'OLX' | 'Allegro' | 'Ceneo' | 'Vinted';
  data: OfferInput;
}

export const SAMPLE_OFFERS: SampleOffer[] = [
  {
    id: 'sample-iphone-15-pro',
    badge: 'Super Okazja',
    badgeColor: 'emerald',
    name: 'Apple iPhone 15 Pro 128GB Black Titanium',
    platform: 'OLX',
    data: {
      url: 'https://www.olx.pl/d/oferta/apple-iphone-15-pro-128gb-tytan-czarny-bateria-92-pudelko-CID99-IDY89a.html',
      title: 'Apple iPhone 15 Pro 128GB Tytan Czarny, bateria 92%, faktura, etui',
      price: '3150',
      currency: 'PLN',
      condition: 'Używany, stan bardzo dobry (drobne ryski na ramce)',
      description: 'Sprzedam prywatny iPhone 15 Pro 128GB kupiony w polskim salonie Apple Store w październiku 2023. Bateria 92%, od nowości szkło Spigen na ekranie i etui. W zestawie oryginalne pudełko, dowód zakupu oraz kabel USB-C. Brak blokad ratalnych czy iCloud. Odbiór osobisty Warszawa Mokotów lub wysyłka OLX.',
      location: 'Warszawa, Mazowieckie',
      sellerType: 'Osoba prywatna (konto od 2018 roku)',
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    },
  },
  {
    id: 'sample-ps5-slim',
    badge: 'Uczciwa Cena',
    badgeColor: 'blue',
    name: 'Sony PlayStation 5 Slim 1TB + 2 Pady',
    platform: 'Allegro',
    data: {
      url: 'https://allegrolokalnie.pl/oferta/konsola-sony-playstation-5-slim-1tb-2-pady-dualsense-gwarancja',
      title: 'Konsola Sony PlayStation 5 Slim 1TB Digital + 2 Pady DualSense + Gwarancja',
      price: '1690',
      currency: 'PLN',
      condition: 'Używany, jak nowy',
      description: 'Konsola PS5 Slim zakupiona 6 miesięcy temu w Media Markt. Posiada gwarancję do 2025 roku (faktura w zestawie). W komplecie 2 oryginalne białe pady DualSense, podstawka pionowa, kabel HDMI 2.1 i kabel zasilający. Sprzęt cichy, bez żadnych ukrytych wad.',
      location: 'Kraków, Małopolskie',
      sellerType: 'Osoba prywatna',
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    },
  },
  {
    id: 'sample-rtx-4070',
    badge: 'Świetny Dil',
    badgeColor: 'emerald',
    name: 'Karta GeForce RTX 4070 SUPER 12GB',
    platform: 'OLX',
    data: {
      url: 'https://www.olx.pl/d/oferta/karta-graficzna-asus-dual-geforce-rtx-4070-super-12gb-gddr6x-CID99-IDZ12b.html',
      title: 'Karta ASUS Dual GeForce RTX 4070 SUPER OC 12GB GDDR6X',
      price: '2250',
      currency: 'PLN',
      condition: 'Używany, stan idealny',
      description: 'Karta graficzna kupiona w x-kom w marcu 2024. Nigdy nie służyła do kopania kryptowalut, wyłącznie weekendowy gaming (Cyberpunk, CS2). Niskie temperatury, ciche wentylatory. Kompletne pudełko, dowód zakupu. Możliwość przetestowania na miejscu.',
      location: 'Wrocław, Dolnośląskie',
      sellerType: 'Osoba prywatna',
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    },
  },
  {
    id: 'sample-scam-trap',
    badge: 'Podejrzanie Tanio ⚠️',
    badgeColor: 'amber',
    name: 'iPhone 16 Pro Max 256GB (Podejrzany!)',
    platform: 'OLX',
    data: {
      url: 'https://www.olx.pl/d/oferta/nowy-iphone-16-pro-max-256gb-pustynny-tytan-zaplombowany-CID99-ID999x.html',
      title: 'NOWY iPhone 16 Pro Max 256GB Desert Titanium, zafoliowany, PILNIE',
      price: '2200',
      currency: 'PLN',
      condition: 'Nowy, fabrycznie zafoliowany',
      description: 'Pilnie sprzedam nowy telefon z prezentu. Zafoliowany, polska dystrybucja. Nie wysyłam za pobraniem przez OLX, preferuję wpłatę BLIK lub przelew ekspresowy przed wysyłką kurierem DPD na mój koszt, bo pilnie potrzebuję gotówki na wyjazd za granicę.',
      location: 'Białystok, Podlaskie',
      sellerType: 'Nowe konto (założone wczoraj)',
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    },
  },
  {
    id: 'sample-lego-falcon',
    badge: 'Dla Kolekcjonera',
    badgeColor: 'indigo',
    name: 'LEGO Star Wars 75192 Sokół Millennium',
    platform: 'Allegro',
    data: {
      url: 'https://allegro.pl/oferta/lego-star-wars-75192-sokol-millennium-ucs-zestaw-kompletny',
      title: 'LEGO Star Wars 75192 Sokół Millennium UCS, stan kolekcjonerski',
      price: '2800',
      currency: 'PLN',
      condition: 'Złożony raz, kompletny 100%, pudełko i instrukcja',
      description: 'Sprzedam legendarny zestaw LEGO 75192 UCS Millennium Falcon. Złożony tylko raz przez dorosłego fana, stał w zamkniętej gablocie, zero kurzu czy słońca. Wszystkie 7541 elementów, komplet figurek, oryginalny karton w nienaruszonym stanie, instrukcja w segregatorze.',
      location: 'Poznań, Wielkopolskie',
      sellerType: 'Osoba prywatna',
      imageBase64: null,
      imageMimeType: 'image/jpeg',
    },
  },
];
