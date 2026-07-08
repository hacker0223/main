import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  InterestTag,
  InvestorType,
  OnboardingAnswers,
  RiskTolerance,
} from "@summit/shared";
import { create } from "zustand";

const STORAGE_KEY = "summit.onboarding.v1";

interface OnboardingState {
  isHydrated: boolean;
  isComplete: boolean;
  answers: OnboardingAnswers;
  hydrate: () => Promise<void>;
  setInvestorType: (investorType: InvestorType) => void;
  toggleInterest: (interest: InterestTag) => void;
  setRiskTolerance: (riskTolerance: RiskTolerance) => void;
  acknowledgeDisclaimer: (accepted: boolean) => void;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
}

const defaultAnswers: OnboardingAnswers = {
  investorType: "casual",
  interests: [],
  riskTolerance: null,
  disclaimerAcknowledged: false,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isHydrated: false,
  isComplete: false,
  answers: defaultAnswers,

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { answers: OnboardingAnswers; isComplete: boolean };
      set({ answers: parsed.answers, isComplete: parsed.isComplete, isHydrated: true });
    } else {
      set({ isHydrated: true });
    }
  },

  setInvestorType: (investorType) =>
    set((state) => ({ answers: { ...state.answers, investorType } })),

  toggleInterest: (interest) =>
    set((state) => {
      const has = state.answers.interests.includes(interest);
      const interests = has
        ? state.answers.interests.filter((i) => i !== interest)
        : [...state.answers.interests, interest];
      return { answers: { ...state.answers, interests } };
    }),

  setRiskTolerance: (riskTolerance) =>
    set((state) => ({ answers: { ...state.answers, riskTolerance } })),

  acknowledgeDisclaimer: (accepted) =>
    set((state) => ({ answers: { ...state.answers, disclaimerAcknowledged: accepted } })),

  complete: async () => {
    set({ isComplete: true });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ answers: get().answers, isComplete: true })
    );
  },

  reset: async () => {
    set({ answers: defaultAnswers, isComplete: false });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
