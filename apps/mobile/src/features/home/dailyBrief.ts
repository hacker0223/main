import type { StockQuote } from "@summit/shared";

// Deliberately not an LLM call: this runs on every Home screen view, and a
// template built from quotes that are already being fetched for the
// screen anyway is free and instant, where an Anthropic call would add
// latency/cost for something this simple. "AI Daily Brief" was a permanent
// placeholder before — this makes sure something real shows up daily,
// without the narration budget concerns that gate Pattern Lab elsewhere.
export function buildDailyBrief(watchlistQuotes: StockQuote[], marketQuotes: StockQuote[]): string {
  const quotes = watchlistQuotes.length > 0 ? watchlistQuotes : marketQuotes;
  if (quotes.length === 0) {
    return "Add a stock to your watchlist to get a quick daily read on how it's moving.";
  }

  const source = watchlistQuotes.length > 0 ? "your watchlist" : "the market snapshot";
  const up = quotes.filter((q) => q.changePercent > 0);
  const down = quotes.filter((q) => q.changePercent < 0);
  const flat = quotes.length - up.length - down.length;

  const biggestMover = [...quotes].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
  const direction = biggestMover.changePercent >= 0 ? "up" : "down";

  const tally =
    quotes.length === 1
      ? `${quotes[0].symbol} is ${quotes[0].changePercent >= 0 ? "up" : "down"} ${Math.abs(quotes[0].changePercent).toFixed(1)}% today.`
      : `${up.length} of ${quotes.length} in ${source} are up today${down.length > 0 ? `, ${down.length} down` : ""}${flat > 0 ? `, ${flat} flat` : ""}.`;

  const leader =
    quotes.length > 1
      ? ` ${biggestMover.symbol} is moving the most, ${direction} ${Math.abs(biggestMover.changePercent).toFixed(1)}%.`
      : "";

  return `${tally}${leader}`;
}
