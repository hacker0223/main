export type MarketPhase = "open" | "pre" | "after" | "closed";

export interface MarketStatus {
  phase: MarketPhase;
  label: string;
}

// US equity market phase from the current time in Eastern Time, regardless
// of the device's own timezone. Regular hours 9:30–16:00 ET Mon–Fri;
// pre-market 4:00–9:30; after-hours 16:00–20:00. Holidays aren't accounted
// for (a rare, minor mislabel), so the label stays general rather than
// claiming a specific session is guaranteed.
export function getMarketStatus(now: Date = new Date()): MarketStatus {
  // Reinterpret "now" as Eastern wall-clock time.
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay(); // 0 Sun … 6 Sat
  const minutes = et.getHours() * 60 + et.getMinutes();

  if (day === 0 || day === 6) return { phase: "closed", label: "Markets closed" };

  const preStart = 4 * 60;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const afterEnd = 20 * 60;

  if (minutes >= open && minutes < close) return { phase: "open", label: "Market open" };
  if (minutes >= preStart && minutes < open) return { phase: "pre", label: "Pre-market" };
  if (minutes >= close && minutes < afterEnd) return { phase: "after", label: "After hours" };
  return { phase: "closed", label: "Markets closed" };
}
