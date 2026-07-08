export interface Article {
  slug: string;
  title: string;
  summary: string;
  readMinutes: number;
  body: string[];
}

export const articles: Article[] = [
  {
    slug: "reading-a-candlestick-chart",
    title: "How to read a candlestick chart",
    summary: "Each bar tells you four numbers at once — here's how to read them in five seconds.",
    readMinutes: 3,
    body: [
      "A candlestick is a compact way to show four prices for one time period: the open, close, high, and low. The thick part — the \"body\" — spans from the open to the close. The thin lines poking out the top and bottom — the \"wicks\" — show the full high-to-low range that period.",
      "Color tells you direction. In Summit, a green candle means the close was higher than the open — price rose over that period. A red candle means the close was lower than the open — price fell.",
      "A long body means a decisive move in one direction. A short body with long wicks means the price swung around a lot but ended up close to where it started — often a sign of indecision.",
      "One candle is one snapshot. The pattern across many candles is what actually tells a story: a string of green candles with small wicks suggests a steady uptrend; long wicks on both ends suggest a choppy, undecided market. Switch between line and candle view any time using the toggle above the chart on a stock's page — line view is easier for spotting the overall trend, candles are better for seeing the day-to-day fight between buyers and sellers.",
    ],
  },
  {
    slug: "what-is-a-good-pe-ratio",
    title: "What is a good PE ratio?",
    summary: "There's no universal \"good\" number — it depends entirely on what you're comparing against.",
    readMinutes: 4,
    body: [
      "The PE ratio (price divided by earnings per share) tells you how many dollars investors are paying today for one dollar of a company's current annual profit. A PE of 20 means the market is pricing the stock at 20 times its earnings.",
      "The trap is treating any single PE number as \"cheap\" or \"expensive\" in isolation. A software company growing revenue 40% a year might reasonably trade at a PE of 50, while a stable utility growing 2% a year at a PE of 15 might be fully priced. Growth expectations, not the raw number, drive what's \"reasonable.\"",
      "The more useful comparisons: this company's PE today vs. its own 5-year average (is it unusually expensive or cheap relative to its own history?), and this company's PE vs. its closest peers in the same industry (is it priced at a premium or discount to similar businesses?).",
      "A very high PE isn't automatically a red flag, and a very low PE isn't automatically a bargain — a low PE can also mean the market expects earnings to fall. Use it as one input alongside growth rate, debt levels, and the business's actual prospects, not as a standalone verdict.",
    ],
  },
  {
    slug: "understanding-rsi-and-macd",
    title: "Understanding RSI and MACD",
    summary: "Two of the most common momentum indicators, and what they're actually measuring underneath.",
    readMinutes: 4,
    body: [
      "RSI and MACD both try to answer the same underlying question — is the recent price momentum strong, weak, or turning — using different math.",
      "RSI (Relative Strength Index) compares the size of recent up-moves to recent down-moves and compresses that into a single 0–100 number. Above 70 is conventionally read as \"overbought\" — the move up has been strong enough that a pause or pullback becomes more likely. Below 30 is \"oversold\" — the reverse. It's a gauge of how stretched a move is, not a countdown timer to a reversal.",
      "MACD (Moving Average Convergence/Divergence) tracks the gap between a faster-moving average and a slower one. When the faster average pulls above the slower one, momentum is building to the upside; when it drops below, momentum is fading. The \"histogram\" you'll see is just that gap drawn as bars, making the shift easier to spot at a glance.",
      "Neither indicator predicts the future — they describe the recent past precisely enough to make the current trend easier to see. They're most useful together with the actual price trend and volume, not as standalone buy or sell signals.",
    ],
  },
  {
    slug: "what-does-beta-tell-you",
    title: "What does beta actually tell you?",
    summary: "Beta measures how jumpy a stock is relative to the market — nothing more, nothing less.",
    readMinutes: 3,
    body: [
      "Beta measures how much a stock's price has historically moved relative to the overall market. The market itself is defined as beta = 1.0. A stock with a beta of 1.5 has tended to move about 50% more than the market in both directions — bigger gains on up days, bigger losses on down days. A beta of 0.6 means the stock has historically been calmer than the market, in both directions.",
      "Beta says nothing about whether a company is good or bad, growing or shrinking, cheap or expensive. It's purely a measure of historical volatility relative to the market — a risk-and-swing gauge, not a quality gauge.",
      "High-beta stocks (often smaller, newer, or in cyclical industries) can outperform sharply in a rising market and underperform sharply in a falling one. Low-beta stocks (often large, stable, less economically sensitive businesses) tend to be a smoother ride either way.",
      "Summit uses beta as one input into the risk score — alongside historical volatility and valuation — precisely because it captures a real, measurable dimension of risk without claiming to know where the stock is headed next.",
    ],
  },
];
