import type { InterestTag } from "@summit/shared";

// Onboarding promises "we'll use these to suggest stocks for your
// watchlist" — this mapping is what actually keeps that promise (Discover
// renders a "Picked for your interests" section from it). Liquid,
// well-known names only, so Finnhub's free-tier quote/profile calls
// resolve reliably; a browsing starting point, never a recommendation.
const suggestionsByInterest: Record<InterestTag, string[]> = {
  tech: ["AAPL", "MSFT", "NVDA", "GOOGL"],
  healthcare: ["JNJ", "UNH", "LLY"],
  dividends: ["KO", "PG", "PEP", "XOM"],
  growth: ["NVDA", "TSLA", "AMZN", "META"],
  crypto_adjacent: ["COIN", "MSTR", "HOOD"],
  etfs: ["SPY", "QQQ", "VTI", "DIA"],
};

const MAX_SUGGESTIONS = 6;

export function suggestionsForInterests(interests: InterestTag[], excludeSymbols: string[] = []): string[] {
  const excluded = new Set(excludeSymbols.map((s) => s.toUpperCase()));
  const out: string[] = [];
  // Round-robin across the picked interests (first pick from each, then
  // second from each, ...) so one interest can't crowd out the others
  // when the combined list gets capped.
  const lists = interests.map((tag) => suggestionsByInterest[tag] ?? []);
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && out.length < MAX_SUGGESTIONS; i++) {
    for (const list of lists) {
      const symbol = list[i];
      if (!symbol || excluded.has(symbol) || out.includes(symbol)) continue;
      out.push(symbol);
      if (out.length >= MAX_SUGGESTIONS) break;
    }
  }
  return out;
}
