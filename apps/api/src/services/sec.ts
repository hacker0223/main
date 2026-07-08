import { cached } from "./cache";
import { fetchWithTimeout, NotFoundError } from "./errors";

// SEC EDGAR is a free, public, no-key-required government API.
// Requires a descriptive User-Agent per SEC's fair-access policy.
const USER_AGENT = "Summit (contact: support@summit.app)";

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let tickerToCikPromise: Promise<Map<string, string>> | null = null;

async function getTickerToCikMap(): Promise<Map<string, string>> {
  if (!tickerToCikPromise) {
    tickerToCikPromise = (async () => {
      const res = await fetchWithTimeout("https://www.sec.gov/files/company_tickers.json", {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) throw new Error(`SEC ticker map fetch failed: ${res.status}`);
      const body = (await res.json()) as Record<string, TickerEntry>;
      const map = new Map<string, string>();
      Object.values(body).forEach((entry) => {
        map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, "0"));
      });
      return map;
    })();
  }
  return tickerToCikPromise;
}

export interface Filing {
  form: string;
  filedDate: string;
  primaryDocument: string;
  accessionNumber: string;
  url: string;
}

const RELEVANT_FORMS = new Set(["10-K", "10-Q", "8-K", "DEF 14A"]);

export async function getFilings(symbol: string): Promise<Filing[]> {
  return cached(`filings:${symbol}`, 3_600_000, async () => {
    const cikMap = await getTickerToCikMap();
    const cik = cikMap.get(symbol.toUpperCase());
    if (!cik) {
      throw new NotFoundError(`No SEC filings found for ${symbol}`);
    }

    const res = await fetchWithTimeout(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`SEC submissions fetch failed: ${res.status}`);

    const body = (await res.json()) as {
      filings: { recent: { form: string[]; filingDate: string[]; primaryDocument: string[]; accessionNumber: string[] } };
    };
    const recent = body.filings.recent;
    const cikNoLeadingZeros = String(Number(cik));

    const filings: Filing[] = [];
    for (let i = 0; i < recent.form.length && filings.length < 20; i++) {
      if (!RELEVANT_FORMS.has(recent.form[i])) continue;
      const accessionNoDashes = recent.accessionNumber[i].replace(/-/g, "");
      filings.push({
        form: recent.form[i],
        filedDate: recent.filingDate[i],
        primaryDocument: recent.primaryDocument[i],
        accessionNumber: recent.accessionNumber[i],
        url: `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}/${recent.primaryDocument[i]}`,
      });
    }
    return filings;
  });
}
