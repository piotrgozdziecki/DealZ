/**
 * DEALZ PERSISTENT PRICE OBSERVATION SERVICE — ITERATION 2
 * Persistent storage of REAL price observations.
 * Persists to disk at ./data/dealz_price_observations.json, surviving process restarts.
 * Zero mocked/simulated points: records ONLY genuine prices fetched from live sources.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PriceObservation, VerificationStatus } from '../types/dealz.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'dealz_price_observations.json');

export interface StoredPriceObservation {
  id: string;
  productKey: string;
  offerId: string;
  sourceId: string;
  price: number;
  currency: string;
  shippingCost: number | null;
  totalCost: number | null;
  verificationStatus: VerificationStatus;
  observedAt: string; // ISO 8601
  evidenceReference: string;
}

export class PriceHistoryStore {
  private observations: StoredPriceObservation[] = [];
  private isLoaded = false;
  private filePath: string;
  private dirPath: string;

  constructor(customFilePath?: string) {
    if (customFilePath) {
      this.filePath = customFilePath;
      this.dirPath = path.dirname(customFilePath);
    } else {
      this.filePath = DATA_FILE;
      this.dirPath = DATA_DIR;
    }
    this.loadFromDisk();
  }

  public clearAll() {
    this.observations = [];
    this.saveToDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(this.dirPath)) {
        fs.mkdirSync(this.dirPath, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.observations = JSON.parse(raw);
      } else {
        this.observations = [];
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn('Failed to load price observations from disk, starting with empty store:', err);
      this.observations = [];
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(this.dirPath)) {
        fs.mkdirSync(this.dirPath, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.observations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist price observations to disk:', err);
    }
  }

  public generateProductKey(
    title: string,
    variant?: Record<string, string>,
    condition: string = 'unknown',
    currency: string = 'PLN'
  ): string {
    const cleanTitle = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);

    const varPart = variant && Object.keys(variant).length > 0
      ? '_' + Object.values(variant).join('-').toLowerCase().replace(/[^a-z0-9]/g, '')
      : '';

    const condPart = condition ? '_' + condition.toLowerCase() : '';
    const currPart = currency ? '_' + currency.toLowerCase() : '_pln';

    return `${cleanTitle}${varPart}${condPart}${currPart}`;
  }

  public recordObservation(obs: Omit<StoredPriceObservation, 'id'>): StoredPriceObservation | null {
    if (!obs.price || isNaN(obs.price) || obs.price <= 0) {
      return null; // Never record invalid prices
    }

    const today = (obs.observedAt || new Date().toISOString()).split('T')[0];

    // Deduplication: prevent duplicate record of exact same offer on the same day
    const existing = this.observations.find(
      (o) =>
        o.productKey === obs.productKey &&
        o.sourceId === obs.sourceId &&
        o.price === obs.price &&
        o.observedAt.startsWith(today)
    );

    if (existing) {
      return existing;
    }

    const newRecord: StoredPriceObservation = {
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      productKey: obs.productKey,
      offerId: obs.offerId,
      sourceId: obs.sourceId,
      price: Math.round(obs.price * 100) / 100,
      currency: obs.currency || 'PLN',
      shippingCost: obs.shippingCost ?? null,
      totalCost: obs.totalCost ?? null,
      verificationStatus: obs.verificationStatus,
      observedAt: obs.observedAt || new Date().toISOString(),
      evidenceReference: obs.evidenceReference || 'Pomiar bezpośredni ze źródła',
    };

    this.observations.push(newRecord);
    this.saveToDisk();
    return newRecord;
  }

  public getHistoryForProduct(productKey: string): {
    points: { date: string; price: number; event?: string }[];
    minPrice: number | null;
    maxPrice: number | null;
    isAllTimeLow: boolean;
    observationsCount: number;
  } {
    const matches = this.observations
      .filter((o) => o.productKey === productKey)
      .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

    if (matches.length === 0) {
      return {
        points: [],
        minPrice: null,
        maxPrice: null,
        isAllTimeLow: false,
        observationsCount: 0,
      };
    }

    const points = matches.map((m) => ({
      date: m.observedAt.split('T')[0],
      price: m.price,
      event: `${m.sourceId} (${m.verificationStatus})`,
    }));

    const prices = matches.map((m) => m.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const latestPrice = prices[prices.length - 1];

    return {
      points,
      minPrice,
      maxPrice,
      isAllTimeLow: latestPrice <= minPrice * 1.01,
      observationsCount: matches.length,
    };
  }

  public getAllObservations(): StoredPriceObservation[] {
    return [...this.observations];
  }
}

export const priceHistoryStore = new PriceHistoryStore();
