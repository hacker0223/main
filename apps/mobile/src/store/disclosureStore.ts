import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "summit.disclosures.v1";

// One-time, explicit acknowledgments — separate from the general onboarding
// disclaimer. Requested directly by user feedback: a passive banner at the
// top of Pattern Lab wasn't enough given people can read a model's output as
// fact just because it came from math. This makes the "not financial advice,
// not a prediction" point something the user actively confirms once, the
// first time they touch the feature that runs a model.
interface DisclosureState {
  isHydrated: boolean;
  acknowledgedPatternLab: boolean;
  hydrate: () => Promise<void>;
  acknowledgePatternLab: () => Promise<void>;
}

async function persist(state: { acknowledgedPatternLab: boolean }) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useDisclosureStore = create<DisclosureState>((set, get) => ({
  isHydrated: false,
  acknowledgedPatternLab: false,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    set({ acknowledgedPatternLab: raw ? (JSON.parse(raw).acknowledgedPatternLab ?? false) : false, isHydrated: true });
  },

  acknowledgePatternLab: async () => {
    set({ acknowledgedPatternLab: true });
    await persist({ acknowledgedPatternLab: true });
  },
}));
