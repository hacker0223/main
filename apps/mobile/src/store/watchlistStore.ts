import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "summit.watchlist.v1";

interface WatchlistState {
  isHydrated: boolean;
  symbols: string[];
  hydrate: () => Promise<void>;
  add: (symbol: string) => Promise<void>;
  remove: (symbol: string) => Promise<void>;
  toggle: (symbol: string) => Promise<void>;
}

async function persist(symbols: string[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  isHydrated: false,
  symbols: [],

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    set({ symbols: raw ? (JSON.parse(raw) as string[]) : [], isHydrated: true });
  },

  add: async (symbol) => {
    const upper = symbol.toUpperCase();
    if (get().symbols.includes(upper)) return;
    const next = [...get().symbols, upper];
    set({ symbols: next });
    await persist(next);
  },

  remove: async (symbol) => {
    const upper = symbol.toUpperCase();
    const next = get().symbols.filter((s) => s !== upper);
    set({ symbols: next });
    await persist(next);
  },

  toggle: async (symbol) => {
    const upper = symbol.toUpperCase();
    if (get().symbols.includes(upper)) {
      await get().remove(upper);
    } else {
      await get().add(upper);
    }
  },
}));
