# Summit — App Store / TestFlight Prep Pack

Everything you need to fill in App Store Connect, written out so you can copy-paste.
Your chosen path: **free TestFlight prelaunch now**, add paid subscriptions after.

Legend:
- 🟢 **Needed for TestFlight** (the prelaunch you're doing now)
- 🔵 **Needed for the full App Store launch** (prep now, use later)

---

## 0. Hosting your legal + support pages (do this once you're on GitHub — no Apple account needed)

App Store Connect **requires** a public Privacy Policy URL and a Support URL. Your pages are already written in `docs/`. Turn on free GitHub Pages hosting:

1. Go to **github.com/hacker0223/main → Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/docs**. Click **Save**.
4. Wait ~1 minute. Your pages go live at:
   - Landing / Support / Marketing URL → `https://hacker0223.github.io/main/`
   - Privacy Policy URL → `https://hacker0223.github.io/main/privacy.html`
   - Terms of Service → `https://hacker0223.github.io/main/terms.html`

Open each to confirm it loads before pasting into App Store Connect.

---

## 1. App identity 🟢

| Field | Value |
|---|---|
| Bundle ID | `com.nathanyoo.summit` (already set) |
| SKU (any unique string you pick) | `summit-ios-001` |
| Primary language | English (U.S.) |
| Home-screen name (already in the app) | Summit |

**App Store listing name** (must be globally unique — "Summit" alone is almost certainly taken):

- **Primary choice:** `Summit: Stock Research` (22/30 chars)
- Fallback 1: `Summit — Stock Insights` (23/30)
- Fallback 2: `Summit: Charts & Investing` (26/30)

> Note: the name on your phone's home screen stays "Summit" regardless. This longer name is only the App Store listing title, and putting "Stock" in it helps people find you in search.

---

## 2. Store listing copy 🔵 (prep now, needed for public launch)

**Subtitle** (30 char max):
```
Stock research for real people
```

**Promotional Text** (170 char max — you can change this anytime without re-review):
```
See how similar historical chart patterns actually played out, with real backtested accuracy. Live quotes, fundamentals, and filings. No hype, no buy/sell signals.
```

**Keywords** (100 char max, comma-separated, no spaces needed):
```
investing,candlestick,technicals,RSI,MACD,watchlist,SEC filings,fundamentals,ETF,ticker,finance
```

**Description** (4000 char max):
```
Summit is a stock research and education app for casual investors — the kind of tool that explains the market instead of nudging you to trade more.

Look up any stock or ETF and get everything in one clean view: live price and quote data, fundamentals pulled straight from SEC filings, standard technical indicators, company news, and the actual regulatory filings. No jargon walls, no cluttered pro-trader dashboards.

WHAT YOU CAN DO

• Research any stock — real quotes, fundamentals, RSI/MACD/Bollinger technicals, news, and SEC EDGAR filings, all in plain language.

• Build a watchlist and set price alerts — kept entirely on your own device. No account, no sign-up.

• Practice in Chart Sandbox — draw trendlines, add candles, and learn to read price action with no real money involved. Import a real stock's last six months to study a genuine chart.

• Explore Pattern Lab — Summit finds real historical chart windows shaped like the one you're looking at and shows what actually happened next: a frequency count from real precedents, plus a trained model's probability estimate with its real backtested accuracy shown next to every number. Not a prediction — a grounded look at history.

BUILT TO INFORM, NOT TO ADVISE

Summit doesn't execute trades, hold your money, or tell you what to buy or sell. It has no incentive to get you trading. Every statistic comes with its real measured accuracy attached, and the AI features are used only to explain numbers that are computed transparently in our own code — never to invent a prediction or a buy/sell signal.

PRIVACY BY DESIGN

No account. No login. No ads or ad-tracking. Your preferences, watchlist, and alerts live on your device, not our servers.

—

Not financial advice. For informational and educational purposes only. Summit is not a registered investment adviser or broker-dealer and does not execute trades. Market data is provided by third parties (Finnhub, Yahoo Finance, SEC EDGAR) and may be delayed or inaccurate. Past patterns do not guarantee future results. Every investment decision is your own.
```

**Category:**
- Primary: **Finance**
- Secondary: **Education**

**Copyright:**
```
2026 Nathan Yoo
```

**URLs** (from Section 0):
- Support URL: `https://hacker0223.github.io/main/`
- Marketing URL: `https://hacker0223.github.io/main/`
- Privacy Policy URL: `https://hacker0223.github.io/main/privacy.html`

---

## 3. App Privacy "nutrition label" 🟢

App Store Connect → your app → **App Privacy**. It asks, category by category, what data you collect.

**Summit's honest answer for almost everything is "Data Not Collected"** — a genuinely strong privacy position. Concretely:

- Contact Info → **Not Collected**
- Health & Fitness → **Not Collected**
- Financial Info → **Not Collected** (watchlist lives on-device; that isn't "collection")
- Location → **Not Collected**
- Sensitive Info → **Not Collected**
- Contacts → **Not Collected**
- Browsing History → **Not Collected**
- Search History → **Not Collected** (ticker searches hit our backend but aren't stored or linked to you)
- Identifiers → **Not Collected** (no user ID, no ad ID)
- Purchases → **Not Collected** (until subscriptions launch — Apple handles that data itself when it does)
- Usage Data → **Not Collected** (no analytics SDK in the app)
- Diagnostics → **Not Collected** (no crash-reporting SDK in the app)

**The one judgment call — User Content:** In Devil's Advocate, a user can type their own thesis, which is sent to Anthropic's API to generate a counter-argument. It is not tied to any identity and not stored by us; Anthropic processes it in real time and (on the commercial API) does not train on it. That fits Apple's definition of *not* "collected." **Recommended: select "Data Not Collected"** for User Content too, since nothing is stored or linked to a person. (If you ever want to be extra conservative, the alternative is: User Content → *not linked to you*, *not used for tracking*, used for *App Functionality*. Either is defensible; the first is simpler and accurate.)

Result: your privacy label shows **"Data Not Collected"** — which is a real selling point, not a workaround.

---

## 4. Age rating 🟢

App Store Connect → **Age Rating** questionnaire. Answer **None / No** to every content question (violence, sexual content, profanity, drugs, horror, etc.). Specifics that matter for a finance app:
- Simulated gambling → **No** (practice charts are not gambling)
- Unrestricted web access → **No** (the app has no open web browser)
- Contests → **No**

Expected result: **4+**.

---

## 5. Export compliance 🟢

Already handled in code — `app.json` now declares `usesNonExemptEncryption: false` (Summit only uses standard HTTPS, which is exempt). App Store Connect should stop asking this on each build. If it ever does ask: answer **"No"** to "Does your app use non-exempt encryption?"

---

## 6. Note to App Review 🟢 (paste into "App Review Information → Notes")

This preempts the questions a reviewer asks about a finance + AI app. Paste verbatim:

```
Summit is an informational and educational stock-research app. It does NOT execute trades, hold or transfer funds, connect to any brokerage, or make buy/sell recommendations. It is not operated by a financial institution and provides no personalized financial advice — this is disclaimed clearly in onboarding, on relevant screens, and in the Terms.

No login is required, so no demo account is needed to review the app. All user data (watchlist, alerts) is stored locally on device.

Market data is sourced from public third-party providers (Finnhub, Yahoo Finance, SEC EDGAR). The "Pattern Lab" AI features use Anthropic's Claude API only to explain statistics that are computed independently in our own backend — the AI is never used to generate a prediction or a trading signal.

Contact for any questions: summitsupport@gmail.com
```

---

## 7. Screenshots 🔵 (not required to START TestFlight; required for public launch)

Apple needs screenshots at the **6.7" iPhone** size: **1290 × 2796 px** (portrait). One is the minimum; up to 10. Good sequence to capture:

1. Home — greeting + Daily Brief + watchlist
2. A stock's Overview — price, chart, and the Pattern Signal card
3. Technicals tab — RSI/MACD/Bollinger
4. Pattern Lab — Historical Analog Matches with the outcome distribution
5. Chart Sandbox — a candlestick chart with the toolbar
6. Discover — screeners + "Picked for your interests"

How to capture: easiest is on your own iPhone once the TestFlight build is installed (screenshot, then it's already the right size for your phone — Apple accepts 6.7" device screenshots). I'll help you assemble and, if you want, add captions later.

---

## 8. The build → TestFlight flow 🟢 (once Apple approves your enrollment)

I'll run these with you when your account is live. In order:

1. `eas build --platform ios --profile production` — EAS builds the app and, on first run, walks you through creating the iOS signing credentials (it can manage these for you).
2. `eas submit --platform ios --profile production` — uploads the finished build to App Store Connect.
3. In App Store Connect → **TestFlight**:
   - Fill in **Test Information** (what to test, feedback email, the export-compliance answer).
   - For **external** testers: create a test group, which triggers a light **Beta App Review** (uses the Note from Section 6).
   - Add testers by email, or enable a **public TestFlight link** you can share with your waitlist.
4. Your waitlist installs the free **TestFlight** app, taps your link, and they're in.

---

## What's left that needs YOU (outside this environment)
- [ ] Enroll in the Apple Developer Program ($99/yr) — in progress
- [ ] Turn on GitHub Pages (Section 0) — 2 minutes, do anytime
- [ ] Confirm the App Store listing name isn't taken (once you're in App Store Connect)
- [ ] Capture screenshots on your iPhone once the build is installed

## What I'll do (in the repo, on your say-so)
- [x] Export-compliance flag in app.json
- [x] Landing/support page + this prep pack
- [ ] Build + submit walkthrough when your account is live
- [ ] The whole subscriptions layer (RevenueCat + paywall + feature gating) after prelaunch
