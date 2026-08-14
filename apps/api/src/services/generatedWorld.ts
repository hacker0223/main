// A completely fictional stock market, generated deterministically from a
// single integer seed.
//
// Nothing here touches real market data. Every company, headline, and price
// is invented — that is the point of the mode, and it's also why the UI
// labels these runs as a fictional market everywhere they appear. Summit's
// whole pitch is being honest about where numbers come from, so generated
// headlines must never be mistakable for real news.
//
// Determinism matters for integrity, not just tidiness: the server stores
// only the seed and recomputes the world on every request, so a client has
// nothing to tamper with, and prices for a day the player hasn't reached
// yet are never sent to the device (see worldUpTo).

export const GENERATED_RUN_DAYS = 7;
export const GENERATED_STOCK_COUNT = 20;
export const GENERATED_START_CASH = 10_000;

// mulberry32 — small, fast, well-distributed seeded PRNG. Same seed always
// yields the same sequence, on any machine.
function mulberry32(seed: number): () => number {
  // Number() rather than trusting the incoming type: the seed round-trips
  // through Postgres/PostgREST, and a numeric column arriving as a string
  // would otherwise reach the bit ops below and silently rely on coercion.
  let a = Number(seed) >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller, so daily returns are normally distributed rather than uniform
// (uniform noise makes price paths look visibly unnatural — too "boxy").
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

// Invented word parts — deliberately synthetic-sounding so a generated
// company never reads as a real one.
const NAME_PREFIX = [
  "Vant", "Sol", "Halc", "Ork", "Zeph", "Cald", "Myr", "Tess", "Brann", "Quill",
  "Ferr", "Nyx", "Ardu", "Pell", "Grav", "Ostr", "Vex", "Lum", "Thal", "Corv",
  "Drav", "Ember", "Fyn", "Glim", "Hask", "Ilex", "Jorn", "Kress", "Lyr", "Morv",
] as const;

const NAME_SUFFIX = [
  "ex", "ora", "ium", "ara", "ix", "os", "elle", "an", "ic", "yr",
  "ada", "on", "eth", "ura", "is", "or", "ane", "ely", "ov", "ay",
] as const;

const COMPANY_TAG = [
  "Dynamics", "Industries", "Labs", "Systems", "Holdings", "Works", "Group",
  "Technologies", "Partners", "Collective", "Foundry", "Union",
] as const;

const SECTORS = [
  "Technology", "Energy", "Healthcare", "Finance",
  "Consumer", "Industrial", "Materials", "Transport",
] as const;

export type GeneratedSector = (typeof SECTORS)[number];

export interface GeneratedCompany {
  symbol: string;
  name: string;
  sector: GeneratedSector;
}

export interface GeneratedEvent {
  day: number; // 0-indexed day within the run
  headline: string;
  detail: string;
  /** Symbols directly moved by this event. */
  affects: string[];
  /** Fractional move applied to those symbols that day (e.g. 0.08 = +8%). */
  impact: number;
  scope: "company" | "sector" | "market";
}

export interface GeneratedWorld {
  companies: GeneratedCompany[];
  events: GeneratedEvent[];
  /** symbol -> price for each day, index 0..GENERATED_RUN_DAYS. */
  prices: Record<string, number[]>;
}

interface CompanyEventTemplate {
  headline: (name: string) => string;
  detail: (name: string) => string;
  impact: [number, number];
}

const COMPANY_EVENTS: readonly CompanyEventTemplate[] = [
  {
    headline: (n) => `${n} beats expectations in quarterly results`,
    detail: (n) => `${n} reported stronger revenue than analysts in this simulation had modelled, driven by higher order volume.`,
    impact: [0.04, 0.14],
  },
  {
    headline: (n) => `${n} misses quarterly targets`,
    detail: (n) => `${n} came in under the revenue range it guided to last quarter, citing softer demand and rising input costs.`,
    impact: [-0.15, -0.05],
  },
  {
    headline: (n) => `${n} announces a major new contract`,
    detail: (n) => `${n} signed a multi-year supply agreement that materially expands its order book.`,
    impact: [0.03, 0.11],
  },
  {
    headline: (n) => `${n} recalls a flagship product`,
    detail: (n) => `${n} pulled one of its highest-volume products after a defect was identified in testing.`,
    impact: [-0.18, -0.07],
  },
  {
    headline: (n) => `${n} replaces its chief executive`,
    detail: (n) => `${n}'s board named a new chief executive effective immediately, without naming a successor plan earlier.`,
    impact: [-0.08, 0.06],
  },
  {
    headline: (n) => `${n} raises full-year guidance`,
    detail: (n) => `${n} lifted its outlook for the rest of the simulated year after a stronger-than-planned quarter.`,
    impact: [0.05, 0.13],
  },
  {
    headline: (n) => `Regulator opens an inquiry into ${n}`,
    detail: (n) => `A regulator in this simulation opened a review of ${n}'s accounting practices. No findings have been published.`,
    impact: [-0.16, -0.06],
  },
  {
    headline: (n) => `${n} announces a share buyback`,
    detail: (n) => `${n} will repurchase a portion of its outstanding shares over the coming quarters.`,
    impact: [0.02, 0.08],
  },
];

interface SectorEventTemplate {
  headline: (s: string) => string;
  detail: (s: string) => string;
  impact: [number, number];
}

const SECTOR_EVENTS: readonly SectorEventTemplate[] = [
  {
    headline: (s) => `New rules tighten oversight across ${s}`,
    detail: (s) => `Simulated regulators introduced compliance requirements that raise operating costs across the ${s} sector.`,
    impact: [-0.09, -0.03],
  },
  {
    headline: (s) => `${s} demand surges on new government spending`,
    detail: (s) => `A spending package in this simulation directs significant funding toward ${s}, lifting expected orders.`,
    impact: [0.03, 0.10],
  },
  {
    headline: (s) => `Supply shortage disrupts ${s}`,
    detail: (s) => `A key input became scarce this week, forcing ${s} companies to slow output.`,
    impact: [-0.10, -0.04],
  },
  {
    headline: (s) => `Breakthrough lifts sentiment across ${s}`,
    detail: (s) => `A widely covered technical advance improved the outlook for ${s} companies broadly.`,
    impact: [0.04, 0.11],
  },
];

interface MarketEventTemplate {
  headline: string;
  detail: string;
  impact: [number, number];
}

const MARKET_EVENTS: readonly MarketEventTemplate[] = [
  {
    headline: "Central bank raises rates unexpectedly",
    detail: "The simulated central bank lifted its benchmark rate ahead of schedule, pressuring valuations market-wide.",
    impact: [-0.07, -0.02],
  },
  {
    headline: "Inflation cools faster than forecast",
    detail: "Price growth in this simulation slowed more than expected, easing pressure on the rate outlook.",
    impact: [0.02, 0.06],
  },
  {
    headline: "Broad selloff as risk appetite fades",
    detail: "Investors in this simulation rotated out of equities following a weak run of economic prints.",
    impact: [-0.08, -0.03],
  },
  {
    headline: "Markets rally on strong employment data",
    detail: "A stronger labour market reading in this simulation lifted sentiment across most sectors.",
    impact: [0.02, 0.07],
  },
];

function buildCompanies(rand: () => number): GeneratedCompany[] {
  const companies: GeneratedCompany[] = [];
  const usedSymbols = new Set<string>();
  const usedNames = new Set<string>();

  let guard = 0;
  while (companies.length < GENERATED_STOCK_COUNT && guard++ < 1000) {
    const prefix = pick(rand, NAME_PREFIX);
    const suffix = pick(rand, NAME_SUFFIX);
    const tag = pick(rand, COMPANY_TAG);
    const base = `${prefix}${suffix}`;
    const name = `${base.charAt(0).toUpperCase()}${base.slice(1)} ${tag}`;
    if (usedNames.has(name)) continue;

    // Ticker derives from the invented name so the two visibly belong
    // together, then falls back to appended letters if it collides.
    const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
    let symbol = letters.slice(0, 4);
    let attempt = 0;
    while (usedSymbols.has(symbol) && attempt < 26) {
      symbol = letters.slice(0, 3) + String.fromCharCode(65 + attempt);
      attempt++;
    }
    if (usedSymbols.has(symbol)) continue;

    usedNames.add(name);
    usedSymbols.add(symbol);
    companies.push({ symbol, name, sector: pick(rand, SECTORS) });
  }

  return companies;
}

function buildEvents(rand: () => number, companies: GeneratedCompany[]): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];

  // Day 0 is the opening snapshot the player buys into, so events start on
  // day 1 — otherwise the first move would already have happened before the
  // player could react to the headline.
  for (let day = 1; day <= GENERATED_RUN_DAYS; day++) {
    const count = 1 + Math.floor(rand() * 3); // 1-3 stories a day
    for (let i = 0; i < count; i++) {
      const roll = rand();

      if (roll < 0.6) {
        const company = pick(rand, companies);
        const t = pick(rand, COMPANY_EVENTS);
        events.push({
          day,
          headline: t.headline(company.name),
          detail: t.detail(company.name),
          affects: [company.symbol],
          impact: range(rand, t.impact[0], t.impact[1]),
          scope: "company",
        });
      } else if (roll < 0.87) {
        const sector = pick(rand, SECTORS);
        const affected = companies.filter((c) => c.sector === sector).map((c) => c.symbol);
        if (affected.length === 0) continue;
        const t = pick(rand, SECTOR_EVENTS);
        events.push({
          day,
          headline: t.headline(sector),
          detail: t.detail(sector),
          affects: affected,
          impact: range(rand, t.impact[0], t.impact[1]),
          scope: "sector",
        });
      } else {
        const t = pick(rand, MARKET_EVENTS);
        events.push({
          day,
          headline: t.headline,
          detail: t.detail,
          affects: companies.map((c) => c.symbol),
          impact: range(rand, t.impact[0], t.impact[1]),
          scope: "market",
        });
      }
    }
  }

  return events;
}

function buildPrices(
  rand: () => number,
  companies: GeneratedCompany[],
  events: GeneratedEvent[]
): Record<string, number[]> {
  const prices: Record<string, number[]> = {};

  // Per-company personality, fixed for the whole run.
  const profile = new Map<string, { drift: number; vol: number }>();
  for (const c of companies) {
    profile.set(c.symbol, {
      drift: range(rand, -0.004, 0.006),
      // Wider than real daily vol on purpose: a 7-day run needs visible
      // movement to be worth playing, and this market is openly fictional.
      vol: range(rand, 0.015, 0.045),
    });
  }

  // Pre-index event impact by day+symbol so the price loop stays O(days).
  const impactByDay = new Map<string, number>();
  for (const e of events) {
    for (const symbol of e.affects) {
      const key = `${e.day}:${symbol}`;
      impactByDay.set(key, (impactByDay.get(key) ?? 0) + e.impact);
    }
  }

  for (const c of companies) {
    const { drift, vol } = profile.get(c.symbol)!;
    const series = [Number(range(rand, 15, 350).toFixed(2))];
    for (let day = 1; day <= GENERATED_RUN_DAYS; day++) {
      const shock = impactByDay.get(`${day}:${c.symbol}`) ?? 0;
      const ret = drift + vol * gaussian(rand) + shock;
      // Floor keeps a bad streak from driving a price to zero or negative,
      // which would make the position unsellable and the maths meaningless.
      const next = Math.max(0.5, series[day - 1] * (1 + ret));
      series.push(Number(next.toFixed(2)));
    }
    prices[c.symbol] = series;
  }

  return prices;
}

export function generateWorld(seed: number): GeneratedWorld {
  const rand = mulberry32(seed);
  const companies = buildCompanies(rand);
  const events = buildEvents(rand, companies);
  const prices = buildPrices(rand, companies, events);
  return { companies, events, prices };
}

export interface GeneratedWorldView {
  day: number;
  totalDays: number;
  companies: (GeneratedCompany & { price: number; changePct: number | null })[];
  events: GeneratedEvent[];
}

// What the client is allowed to see at a given day. Prices and headlines for
// days the player hasn't reached are withheld — sending the full world would
// hand over the answer key and make the whole mode pointless.
export function worldUpTo(seed: number, day: number): GeneratedWorldView {
  const clamped = Math.max(0, Math.min(GENERATED_RUN_DAYS, day));
  const world = generateWorld(seed);

  return {
    day: clamped,
    totalDays: GENERATED_RUN_DAYS,
    companies: world.companies.map((c) => {
      const series = world.prices[c.symbol];
      const price = series[clamped];
      const prev = clamped > 0 ? series[clamped - 1] : null;
      return {
        ...c,
        price,
        changePct: prev === null ? null : ((price - prev) / prev) * 100,
      };
    }),
    events: world.events.filter((e) => e.day <= clamped).sort((a, b) => b.day - a.day),
  };
}

export function generatedPrice(seed: number, symbol: string, day: number): number | null {
  const world = generateWorld(seed);
  const series = world.prices[symbol];
  if (!series) return null;
  return series[Math.max(0, Math.min(GENERATED_RUN_DAYS, day))];
}
