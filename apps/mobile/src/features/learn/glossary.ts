export interface GlossaryTerm {
  term: string;
  definition: string;
}

// Plain-English, hype-free definitions in Summit's voice: describe what a
// thing is, and where useful, what it does NOT tell you. Kept roughly
// alphabetical; the Learn screen also offers search over term + definition.
export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "After-Hours Trading",
    definition:
      "Trading that happens after the regular market close (4:00 PM ET) until 8:00 PM ET. Volume is thinner, so prices can swing more on less activity — an after-hours move doesn't always hold up when the regular market reopens.",
  },
  {
    term: "Analyst Consensus",
    definition:
      "A summary of buy/hold/sell ratings from Wall Street analysts covering a stock. It's third-party opinion, aggregated — not a recommendation from Summit.",
  },
  {
    term: "Asset Allocation",
    definition:
      "How you divide your money across different types of investments — stocks, bonds, cash, and so on. It's one of the biggest drivers of how much a portfolio swings over time.",
  },
  {
    term: "Balance Sheet",
    definition:
      "A snapshot of what a company owns (assets) and owes (liabilities) at a point in time, with the difference being shareholders' equity. One of the three core financial statements, filed with the SEC.",
  },
  {
    term: "Bear Market",
    definition:
      "A prolonged decline in prices, commonly defined as a drop of 20% or more from a recent high. The opposite of a bull market. Says nothing about any individual stock.",
  },
  {
    term: "Beta",
    definition:
      "How much a stock tends to move relative to the overall market. A beta of 1.0 moves roughly with the market; above 1.0 swings harder in both directions; below 1.0 is more muted. It's a measure of volatility, not quality.",
  },
  {
    term: "Bid–Ask Spread",
    definition:
      "The gap between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask). A narrow spread usually means a heavily traded, liquid stock; a wide one means fewer buyers and sellers.",
  },
  {
    term: "Blue-Chip Stock",
    definition:
      "An informal label for a large, well-established, financially sound company with a long track record. It signals size and stability, not a guarantee — blue chips fall too.",
  },
  {
    term: "Bollinger Bands",
    definition:
      "A band drawn above and below a moving average, sized by recent volatility. Price pushing against the upper or lower band suggests it's stretched relative to its recent range — not necessarily a reversal, just a stretch.",
  },
  {
    term: "Book Value",
    definition:
      "A company's assets minus its liabilities — roughly what would be left for shareholders on paper if it sold everything and paid its debts. Compared to market cap via the price-to-book ratio.",
  },
  {
    term: "Breakout",
    definition:
      "When a price moves decisively past a level it had been stuck below (resistance) or above (support). Traders watch breakouts for momentum, but they can also be false — a move that reverses right after.",
  },
  {
    term: "Bull Market",
    definition:
      "A sustained rise in prices, often defined as a 20%+ gain from a recent low. The opposite of a bear market. A market-wide description, not a call on any single stock.",
  },
  {
    term: "Candlestick",
    definition:
      "A chart bar showing four prices for one period: open, high, low, and close. The thick 'body' spans open to close (green if it rose, red if it fell); the thin 'wicks' show the full high-to-low range.",
  },
  {
    term: "Capital Gain",
    definition:
      "The profit from selling an investment for more than you paid. 'Realized' once you sell; 'unrealized' while you still hold. Often taxed — the rate can depend on how long you held it.",
  },
  {
    term: "Cash Flow Statement",
    definition:
      "One of the three core financial statements, tracking the actual cash moving in and out of a company from operations, investing, and financing — a reality check on the profit shown on the income statement.",
  },
  {
    term: "Compounding",
    definition:
      "Earning returns on your past returns, not just your original investment. Small, steady growth builds on itself over long periods — the core reason time in the market matters.",
  },
  {
    term: "Diversification",
    definition:
      "Spreading money across different investments so no single one can sink the whole portfolio. It reduces company-specific risk, though it can't remove the risk of the whole market falling together.",
  },
  {
    term: "Dividend",
    definition:
      "A portion of a company's profit paid out to shareholders, usually in cash and usually quarterly. Not all companies pay one — many growth companies reinvest profits instead.",
  },
  {
    term: "Dividend Payout Ratio",
    definition:
      "The share of a company's earnings paid out as dividends. A very high ratio can mean a generous dividend — or one that may be hard to sustain if earnings dip.",
  },
  {
    term: "Dividend Yield",
    definition:
      "Annual dividend payments per share, as a percentage of the current share price. A 3% yield means you'd earn roughly 3% of your investment back per year in dividends alone, before any price change.",
  },
  {
    term: "Dollar-Cost Averaging",
    definition:
      "Investing a fixed amount on a regular schedule regardless of price. It buys more shares when prices are low and fewer when high, and takes the guesswork out of timing.",
  },
  {
    term: "Earnings (Net Income)",
    definition:
      "A company's profit after all costs, expenses, and taxes — the 'bottom line' of the income statement. Divide it by share count and you get earnings per share (EPS).",
  },
  {
    term: "Earnings Call",
    definition:
      "A scheduled call, usually quarterly, where a company's management discusses results and takes analyst questions. Often moves the stock as much as the numbers themselves, based on tone and guidance.",
  },
  {
    term: "Earnings Season",
    definition:
      "The stretch each quarter when most public companies report results, roughly in the weeks after each quarter ends. Prices can be extra jumpy during it.",
  },
  {
    term: "EMA (Exponential Moving Average)",
    definition:
      "A moving average that weights recent prices more heavily than older ones, so it reacts faster to new moves than a simple moving average. Used the same way — to read trend direction.",
  },
  {
    term: "EPS (Earnings Per Share)",
    definition:
      "A company's profit divided by its number of outstanding shares — the per-share slice of what it earned.",
  },
  {
    term: "ETF (Exchange-Traded Fund)",
    definition:
      "A basket of many investments (say, every stock in the S&P 500) that trades on an exchange like a single stock. A common way to get instant diversification in one purchase.",
  },
  {
    term: "Ex-Dividend Date",
    definition:
      "The cutoff date for a dividend: buy the stock on or after it and you won't receive the next payment; the seller does. The price typically drops by roughly the dividend amount that day.",
  },
  {
    term: "Exchange",
    definition:
      "The marketplace where stocks are bought and sold — in the U.S., mainly the NYSE and the Nasdaq. A company's stock is 'listed' on an exchange, which sets rules it must follow to stay listed.",
  },
  {
    term: "Expense Ratio",
    definition:
      "The annual fee an ETF or mutual fund charges, as a percentage of your investment. A 0.05% ratio costs $5 a year per $10,000; a 1% ratio costs $100. Small differences compound over decades.",
  },
  {
    term: "Float",
    definition:
      "The number of a company's shares actually available for public trading — total shares minus those locked up by insiders or major holders. A small float can make a stock more volatile.",
  },
  {
    term: "Free Cash Flow",
    definition:
      "The cash a company has left after paying to run and maintain the business. It's the money available to pay dividends, buy back stock, or pay down debt — often watched more closely than reported profit.",
  },
  {
    term: "Growth Stock",
    definition:
      "A company expected to grow revenue or earnings faster than average, often reinvesting profits rather than paying dividends. Usually carries a higher valuation — and more to lose if growth slows.",
  },
  {
    term: "Guidance",
    definition:
      "A company's own forecast for upcoming results (like next quarter's revenue). Markets often react more to whether guidance beats or misses expectations than to the results just reported.",
  },
  {
    term: "Income Statement",
    definition:
      "One of the three core financial statements, showing revenue, costs, and profit over a period. It answers 'did the company make money, and how much?'",
  },
  {
    term: "Index",
    definition:
      "A measured basket of stocks used to track a slice of the market — the S&P 500 (500 large U.S. companies), the Nasdaq Composite, the Dow. You can't buy an index directly, but index funds and ETFs track them.",
  },
  {
    term: "Index Fund",
    definition:
      "A fund built to mirror an index rather than beat it, by simply holding what the index holds. Low-cost and passive — the opposite approach to a manager actively picking stocks.",
  },
  {
    term: "Insider Transaction",
    definition:
      "A buy or sell of company stock by an executive, director, or major shareholder. Legally required to be publicly disclosed. Doesn't automatically signal anything — insiders sell for all kinds of ordinary reasons — but large or clustered activity is often worth a second look.",
  },
  {
    term: "IPO (Initial Public Offering)",
    definition:
      "The first time a private company sells shares to the public and lists on an exchange. IPOs can be volatile early on, with limited trading history to judge them by.",
  },
  {
    term: "Liquidity",
    definition:
      "How easily an asset can be bought or sold without moving its price much. A heavily traded large-cap is highly liquid; a thinly traded small-cap is not, so orders can shift the price.",
  },
  {
    term: "Market Cap",
    definition:
      "The total value of a company's shares — share price × total shares outstanding. A quick way to gauge company size: large-cap ($10B+), mid-cap ($2B–$10B), small-cap (under $2B).",
  },
  {
    term: "Market Order vs. Limit Order",
    definition:
      "A market order buys or sells right away at the best available price. A limit order only executes at a price you set or better, but may not fill at all if the market never reaches it.",
  },
  {
    term: "MACD",
    definition:
      "Short for Moving Average Convergence/Divergence — compares a faster and slower moving average to gauge momentum. When the MACD line crosses above its signal line, momentum is shifting up; crossing below, it's shifting down.",
  },
  {
    term: "Moving Average (SMA)",
    definition:
      "The average closing price over a set number of periods (e.g. the last 50 days), updated each day. Smooths out day-to-day noise to show the underlying trend. Price trading above its moving average is generally read as an uptrend; below, a downtrend.",
  },
  {
    term: "Mutual Fund",
    definition:
      "A professionally managed pool of many investors' money invested in a basket of assets. Unlike an ETF, it trades once a day at a price set after the market closes.",
  },
  {
    term: "Operating Margin",
    definition:
      "Operating profit as a percentage of revenue — how many cents of each sales dollar are left after the costs of running the business, before interest and taxes. A gauge of core efficiency.",
  },
  {
    term: "PE Ratio (Price-to-Earnings)",
    definition:
      "Share price divided by earnings per share. Shows how much investors are paying for each dollar of profit. \"Trailing\" PE uses the last 12 months of actual earnings; \"forward\" PE uses analysts' estimates for the next 12 months. Higher usually means the market expects faster growth — but it also means more room to disappoint.",
  },
  {
    term: "PEG Ratio",
    definition:
      "The PE ratio divided by the company's expected earnings growth rate. It puts a high PE in context — a pricey stock growing fast may look more reasonable on a PEG basis than on PE alone.",
  },
  {
    term: "Penny Stock",
    definition:
      "A very low-priced stock, typically under $5 and from a small company. Often thinly traded and highly volatile, and a frequent target of manipulation — treated with caution for good reason.",
  },
  {
    term: "Portfolio",
    definition:
      "The full collection of investments you hold. Looking at a portfolio as a whole — rather than one stock at a time — is how you gauge your real diversification and risk.",
  },
  {
    term: "Price-to-Book (P/B)",
    definition:
      "Share price compared to book value per share. A rough gauge of how the market values a company versus its net assets on paper — most meaningful for asset-heavy businesses like banks.",
  },
  {
    term: "Price-to-Sales (P/S)",
    definition:
      "Market cap divided by annual revenue. Useful for valuing companies that aren't yet profitable, where a PE ratio doesn't exist because there are no earnings to divide by.",
  },
  {
    term: "Probabilistic Price Range",
    definition:
      "A statistically grounded range (e.g. \"80% confidence between $X and $Y over 30 days\") derived from a stock's historical volatility — not a prediction of where the price will land, just an honest description of how much it typically moves.",
  },
  {
    term: "Revenue",
    definition:
      "The total money a company brings in from sales before any costs — the 'top line.' Growing revenue matters, but a company can grow revenue and still lose money.",
  },
  {
    term: "Risk Score",
    definition:
      "Summit's own composite score (0–100) blending a stock's historical volatility, beta, and valuation into one number, with the formula shown so you can see exactly why a stock scored the way it did.",
  },
  {
    term: "Risk Tolerance",
    definition:
      "How much price swing and potential loss you can handle — financially and emotionally — without abandoning your plan. A personal input, not a market measure.",
  },
  {
    term: "RSI (Relative Strength Index)",
    definition:
      "A 0–100 momentum gauge based on recent gains vs. losses. Above 70 is typically read as \"overbought\" (may be due for a pullback), below 30 as \"oversold\" (may be due for a bounce). It's a momentum signal, not a prediction.",
  },
  {
    term: "SEC / EDGAR",
    definition:
      "The SEC (Securities and Exchange Commission) is the U.S. regulator that requires public companies to disclose financial information. EDGAR is its free public database where those filings — 10-Ks, 10-Qs, 8-Ks — are posted.",
  },
  {
    term: "Shares Outstanding",
    definition:
      "The total number of a company's shares currently held by everyone — insiders, institutions, and the public. Multiply by share price to get market cap; divide profit by it to get EPS.",
  },
  {
    term: "Short Selling",
    definition:
      "Betting a stock will fall by borrowing shares, selling them, and aiming to buy them back cheaper. Losses are theoretically unlimited if the price keeps rising — a high-risk strategy.",
  },
  {
    term: "Stock Split",
    definition:
      "When a company divides each share into more shares (e.g. 4-for-1), lowering the per-share price without changing the company's total value. Your slice of the company is unchanged — just cut into smaller pieces.",
  },
  {
    term: "Support & Resistance",
    definition:
      "Price levels where a stock has repeatedly stopped falling (support) or stopped rising (resistance) in the past. Widely watched, but they're tendencies from history, not guarantees.",
  },
  {
    term: "Ticker Symbol",
    definition:
      "The short code that identifies a stock on an exchange — AAPL for Apple, MSFT for Microsoft. What you type to look up or trade a specific company.",
  },
  {
    term: "10-K / 10-Q",
    definition:
      "Official filings companies are required to submit to the SEC. A 10-K is the annual report (audited, comprehensive); a 10-Q is the quarterly update (unaudited, lighter). Both are public record via SEC EDGAR.",
  },
  {
    term: "8-K",
    definition:
      "An SEC filing companies use to announce major events between quarterly reports — an acquisition, a leadership change, big financial news. The 'something just happened' filing.",
  },
  {
    term: "Trend",
    definition:
      "The general direction of a price over time — up, down, or sideways. Reading the trend is the starting point for most chart analysis, though trends can and do reverse.",
  },
  {
    term: "52-Week Range",
    definition:
      "The lowest and highest price a stock has traded at over the past year — useful context for whether today's price is near a recent extreme.",
  },
  {
    term: "Volatility",
    definition:
      "How much a stock's price swings over time, typically measured as the standard deviation of its returns. Higher volatility means bigger swings in both directions, not just down.",
  },
  {
    term: "Volume",
    definition:
      "The number of shares traded in a given period. A price move on unusually high volume tends to carry more weight than the same move on a quiet day.",
  },
  {
    term: "Yield",
    definition:
      "The income an investment produces, as a percentage of its price. For a stock, usually its dividend yield; the term appears across investing to mean 'annual income relative to what you paid.'",
  },
];
