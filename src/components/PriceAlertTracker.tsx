import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  TrendingDown, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  PlusCircle, 
  CheckCircle2, 
  Zap,
  Cloud
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { savePriceAlertToFirestore, deletePriceAlertFromFirestore } from '../lib/firebase';

export interface TrackedItem {
  id: string;
  title: string;
  initialPrice: number;
  targetPrice: number;
  currentLowestPrice: number;
  currency: string;
  bestStore: string;
  bestUrl: string;
  lastCheckedAt: string;
  hasPriceDropped: boolean;
  priceDropAmount: number;
  dateAdded: string;
}

const STORAGE_KEY = 'dealradar_price_alerts_v1';

interface PriceAlertTrackerProps {
  currentProductTitle?: string;
  currentProductPrice?: number;
  currentProductUrl?: string;
  userId?: string;
}

export const PriceAlertTracker: React.FC<PriceAlertTrackerProps> = ({
  currentProductTitle,
  currentProductPrice,
  currentProductUrl,
  userId,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [isCheckingPrices, setIsCheckingPrices] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New item form inputs
  const [newTitle, setNewTitle] = useState(currentProductTitle || '');
  const [newTargetPrice, setNewTargetPrice] = useState<string>(
    currentProductPrice ? String(Math.round(currentProductPrice * 0.9)) : ''
  );
  const [newInitialPrice, setNewInitialPrice] = useState<string>(
    currentProductPrice ? String(currentProductPrice) : ''
  );

  // Sync state if currentProduct props change
  useEffect(() => {
    if (currentProductTitle) setNewTitle(currentProductTitle);
    if (currentProductPrice) {
      setNewInitialPrice(String(currentProductPrice));
      setNewTargetPrice(String(Math.round(currentProductPrice * 0.9)));
    }
  }, [currentProductTitle, currentProductPrice]);

  // Load tracked items from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTrackedItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load tracked items:', e);
    }
  }, []);

  // Save tracked items to localStorage & Firestore
  const saveTrackedItems = (items: TrackedItem[]) => {
    setTrackedItems(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save tracked items:', e);
    }
  };

  // Request browser Notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Twoja przeglądarka nie obsługuje natywnych powiadomień Web Notification API.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('DealRadar AI • Powiadomienia Włączone! 🔔', {
          body: 'Będziemy Cię informować o każdym spadku ceny dla obserwowanych przedmiotów.',
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  // Trigger Native Web Notification
  const triggerNativeNotification = (item: TrackedItem) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const title = `📉 SPADEK CENY: ${item.title}`;
      const body = `Cena spadła o ${item.priceDropAmount} PLN! Aktualnie najtaniej za ${item.currentLowestPrice} ${item.currency} na ${item.bestStore}.`;
      
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: item.id,
      });

      notif.onclick = () => {
        window.focus();
        if (item.bestUrl) window.open(item.bestUrl, '_blank');
      };
    }
  };

  // Add new item to price tracker
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const initPrice = Number(newInitialPrice) || 1000;
    const targPrice = Number(newTargetPrice) || Math.round(initPrice * 0.9);

    const newItem: TrackedItem = {
      id: 'alert_' + Date.now(),
      title: newTitle.trim(),
      initialPrice: initPrice,
      targetPrice: targPrice,
      currentLowestPrice: initPrice,
      currency: 'PLN',
      bestStore: 'Allegro / OLX',
      bestUrl: currentProductUrl || `https://allegro.pl/listing?string=${encodeURIComponent(newTitle.trim())}&order=p`,
      lastCheckedAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      hasPriceDropped: false,
      priceDropAmount: 0,
      dateAdded: new Date().toISOString().split('T')[0],
    };

    saveTrackedItems([newItem, ...trackedItems]);
    setShowAddModal(false);

    // Save to Firestore if user ID available
    if (userId) {
      savePriceAlertToFirestore(userId, {
        id: newItem.id,
        title: newItem.title,
        targetPrice: newItem.targetPrice,
        currentPrice: newItem.currentLowestPrice,
        originalPrice: newItem.initialPrice,
        url: newItem.bestUrl
      }).catch(err => console.warn('Firestore price alert save warning:', err));
    }

    // If permission not granted yet, ask user
    if (notificationPermission !== 'granted') {
      requestNotificationPermission();
    }
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    saveTrackedItems(trackedItems.filter((i) => i.id !== id));
    if (userId) {
      deletePriceAlertFromFirestore(userId, id)
        .catch(err => console.warn('Firestore price alert delete warning:', err));
    }
  };

  // Check live market prices for all tracked items
  const checkLivePrices = useCallback(async () => {
    if (trackedItems.length === 0 || isCheckingPrices) return;
    setIsCheckingPrices(true);

    const updatedItems = [...trackedItems];
    let priceDropCount = 0;

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      try {
        const res = await fetch('/api/compare-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: item.title,
            targetPrice: String(item.initialPrice),
          }),
        });

        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const liveBest = Number(json.data.bestPrice) || item.currentLowestPrice;
          const liveStore = json.data.stores?.[0]?.platform || 'Sklep E-Commerce';
          const liveUrl = json.data.stores?.[0]?.url || item.bestUrl;

          // Calculate if price dropped
          if (liveBest < item.initialPrice) {
            const dropVal = item.initialPrice - liveBest;
            const wasAlreadyDropped = item.hasPriceDropped;

            updatedItems[i] = {
              ...item,
              currentLowestPrice: liveBest,
              bestStore: liveStore,
              bestUrl: liveUrl,
              lastCheckedAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
              hasPriceDropped: true,
              priceDropAmount: dropVal,
            };

            // Trigger notification if newly dropped
            if (!wasAlreadyDropped) {
              triggerNativeNotification(updatedItems[i]);
              priceDropCount++;
            }
          } else {
            updatedItems[i] = {
              ...item,
              currentLowestPrice: liveBest,
              bestStore: liveStore,
              bestUrl: liveUrl,
              lastCheckedAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            };
          }
        }
      } catch (err) {
        console.warn('Failed to check live price for', item.title, err);
      }
    }

    saveTrackedItems(updatedItems);
    setIsCheckingPrices(false);

    if (priceDropCount > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#f59e0b'],
        });
      } catch (e) {
        // ignore
      }
    }
  }, [trackedItems, isCheckingPrices, notificationPermission]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              System Powiadomień o Spadku Ceny (Web Notification API)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                <Cloud className="w-2.5 h-2.5 text-emerald-400" /> Firestore Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Otrzymuj automatyczne alerty w przeglądarce, gdy cena obserwowanego produktu spadnie poniżej ustalonego progu. Zapisywane w chmurze Firebase.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>Włącz Powiadomienia</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Powiadomienia Aktywne</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-white transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Dodaj do Obserwowanych</span>
          </button>
        </div>
      </div>

      {/* Tracked Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Obserwowane Produkty ({trackedItems.length})
          </span>

          <button
            type="button"
            onClick={checkLivePrices}
            disabled={isCheckingPrices || trackedItems.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPrices ? 'animate-spin' : ''}`} />
            <span>{isCheckingPrices ? 'Sprawdzam ceny...' : 'Sprawdź spadki cen na żywo'}</span>
          </button>
        </div>

        {trackedItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
            <BellOff className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">Brak Obserwowanych Produktów</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Dodaj produkt, który analizowałeś, a system wyśle powiadomienie Web Notification w momencie, gdy pojawi się tańsza oferta na Allegro, OLX lub Ceneo.
            </p>
            {currentProductTitle && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Dodaj: &quot;{currentProductTitle}&quot;</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {trackedItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.hasPriceDropped
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                {/* Left info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Dodano: {item.dateAdded}</span>
                    {item.hasPriceDropped && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> SPADEK CENY!
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1">
                    {item.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                    <span>Początkowa: <strong className="text-slate-300">{item.initialPrice} {item.currency}</strong></span>
                    <span>Próg alertu: <strong className="text-amber-400">{item.targetPrice} {item.currency}</strong></span>
                    <span>Ostatnie sprawdzanie: <strong className="text-slate-300">{item.lastCheckedAt}</strong></span>
                  </div>
                </div>

                {/* Right price & action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-extrabold font-mono text-white">
                      {item.currentLowestPrice.toLocaleString()} <span className="text-xs font-normal text-slate-400">{item.currency}</span>
                    </div>
                    {item.hasPriceDropped ? (
                      <span className="text-[10px] font-bold text-emerald-400 block font-mono">
                        Oszczędzasz {item.priceDropAmount} PLN!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 block">cena aktualna</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.bestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <span>Kup</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 transition"
                      title="Usuń z obserwowanych"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                Dodaj Alert Spadku Ceny (Firestore)
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nazwa produktu:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Poco X6 Pro 12/512GB"
                  className="w-full min-h-[40px] px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cena obecna (zł):
                  </label>
                  <input
                    type="number"
                    required
                    value={newInitialPrice}
                    onChange={(e) => setNewInitialPrice(e.target.value)}
                    placeholder="1250"
                    className="w-full min-h-[40px] px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Próg alertu (zł):
                  </label>
                  <input
                    type="number"
                    required
                    value={newTargetPrice}
                    onChange={(e) => setNewTargetPrice(e.target.value)}
                    placeholder="1100"
                    className="w-full min-h-[40px] px-3 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                Powiadomienie przeglądarki zostanie wysłane automatycznie, gdy cena w sklepach spadnie poniżej podanego progu alertu.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                >
                  Zapisz Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
