import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "summit.priceAlerts.v1";

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  createdAt: number;
  triggeredAt: number | null;
}

interface AlertState {
  isHydrated: boolean;
  alerts: PriceAlert[];
  hydrate: () => Promise<void>;
  add: (symbol: string, targetPrice: number, direction: "above" | "below") => Promise<void>;
  remove: (id: string) => Promise<void>;
  // Checked opportunistically whenever a screen has a fresh quote for a
  // symbol (there's no server-side push infra behind this — an alert only
  // fires when you actually have the stock open, or Watchlist happens to
  // refetch it). Returns the alerts that just flipped to triggered, so the
  // caller can show a banner exactly once per crossing.
  checkPrice: (symbol: string, price: number) => Promise<PriceAlert[]>;
}

async function persist(alerts: PriceAlert[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export const useAlertStore = create<AlertState>((set, get) => ({
  isHydrated: false,
  alerts: [],

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    set({ alerts: raw ? (JSON.parse(raw) as PriceAlert[]) : [], isHydrated: true });
  },

  add: async (symbol, targetPrice, direction) => {
    const next: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol: symbol.toUpperCase(),
      targetPrice,
      direction,
      createdAt: Date.now(),
      triggeredAt: null,
    };
    const alerts = [...get().alerts, next];
    set({ alerts });
    await persist(alerts);
  },

  remove: async (id) => {
    const alerts = get().alerts.filter((a) => a.id !== id);
    set({ alerts });
    await persist(alerts);
  },

  checkPrice: async (symbol, price) => {
    const upper = symbol.toUpperCase();
    const justTriggered: PriceAlert[] = [];
    const alerts = get().alerts.map((a) => {
      if (a.symbol !== upper || a.triggeredAt) return a;
      const crossed = a.direction === "above" ? price >= a.targetPrice : price <= a.targetPrice;
      if (!crossed) return a;
      const updated = { ...a, triggeredAt: Date.now() };
      justTriggered.push(updated);
      return updated;
    });
    if (justTriggered.length > 0) {
      set({ alerts });
      await persist(alerts);
    }
    return justTriggered;
  },
}));
