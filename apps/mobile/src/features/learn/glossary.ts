export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Market Cap",
    definition:
      "The total value of a company's shares — share price × total shares outstanding. A quick way to gauge company size: large-cap ($10B+), mid-cap ($2B–$10B), small-cap (under $2B).",
  },
  {
    term: "PE Ratio (Price-to-Earnings)",
    definition:
      "Share price divided by earnings per share. Shows how much investors are paying for each dollar of profit. \"Trailing\" PE uses the last 12 months of actual earnings; \"forward\" PE uses analysts' estimates for the next 12 months. Higher usually means the market expects faster growth — but it also means more room to disappoint.",
  },
  {
    term: "EPS (Earnings Per Share)",
    definition: "A company's profit divided by its number of outstanding shares — the per-share slice of what it earned.",
  },
  {
    term: "Dividend Yield",
    definition:
      "Annual dividend payments per share, as a percentage of the current share price. A 3% yield means you'd earn roughly 3% of your investment back per year in dividends alone, before any price change.",
  },
  {
    term: "Beta",
    definition:
      "How much a stock tends to move relative to the overall market. A beta of 1.0 moves roughly with the market; above 1.0 swings harder in both directions; below 1.0 is more muted. It's a measure of volatility, not quality.",
  },
  {
    term: "52-Week Range",
    definition: "The lowest and highest price a stock has traded at over the past year — useful context for whether today's price is near a recent extreme.",
  },
  {
    term: "Volume",
    definition: "The number of shares traded in a given period. A price move on unusually high volume tends to carry more weight than the same move on a quiet day.",
  },
  {
    term: "Moving Average (SMA)",
    definition:
      "The average closing price over a set number of periods (e.g. the last 50 days), updated each day. Smooths out day-to-day noise to show the underlying trend. Price trading above its moving average is generally read as an uptrend; below, a downtrend.",
  },
  {
    term: "RSI (Relative Strength Index)",
    definition:
      "A 0–100 momentum gauge based on recent gains vs. losses. Above 70 is typically read as \"overbought\" (may be due for a pullback), below 30 as \"oversold\" (may be due for a bounce). It's a momentum signal, not a prediction.",
  },
  {
    term: "MACD",
    definition:
      "Short for Moving Average Convergence/Divergence — compares a faster and slower moving average to gauge momentum. When the MACD line crosses above its signal line, momentum is shifting up; crossing below, it's shifting down.",
  },
  {
    term: "Bollinger Bands",
    definition:
      "A band drawn above and below a moving average, sized by recent volatility. Price pushing against the upper or lower band suggests it's stretched relative to its recent range — not necessarily a reversal, just a stretch.",
  },
  {
    term: "Analyst Consensus",
    definition:
      "A summary of buy/hold/sell ratings from Wall Street analysts covering a stock. It's third-party opinion, aggregated — not a recommendation from Summit.",
  },
  {
    term: "Volatility",
    definition:
      "How much a stock's price swings over time, typically measured as the standard deviation of its returns. Higher volatility means bigger swings in both directions, not just down.",
  },
  {
    term: "Risk Score",
    definition:
      "Summit's own composite score (0–100) blending a stock's historical volatility, beta, and valuation into one number, with the formula shown so you can see exactly why a stock scored the way it did.",
  },
  {
    term: "Probabilistic Price Range",
    definition:
      "A statistically grounded range (e.g. \"80% confidence between $X and $Y over 30 days\") derived from a stock's historical volatility — not a prediction of where the price will land, just an honest description of how much it typically moves.",
  },
  {
    term: "10-K / 10-Q",
    definition:
      "Official filings companies are required to submit to the SEC. A 10-K is the annual report (audited, comprehensive); a 10-Q is the quarterly update (unaudited, lighter). Both are public record via SEC EDGAR.",
  },
  {
    term: "Insider Transaction",
    definition:
      "A buy or sell of company stock by an executive, director, or major shareholder. Legally required to be publicly disclosed. Doesn't automatically signal anything — insiders sell for all kinds of ordinary reasons — but large or clustered activity is often worth a second look.",
  },
];
