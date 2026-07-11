import { create } from "zustand";

// Tracks whether we're waiting on a (likely cold-starting) backend. Driven
// by warmUpBackend() and cleared by any successful API response. Used only
// to show a small, honest "waking up" banner so a first-time user on a
// free-tier cold start sees reassurance instead of a screen full of
// timeout errors.
interface ServerStatusState {
  warming: boolean;
  setWarming: (warming: boolean) => void;
}

export const useServerStatus = create<ServerStatusState>((set) => ({
  warming: false,
  setWarming: (warming) => set({ warming }),
}));
