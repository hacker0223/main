"""Ticker basket for the pattern-match/classifier data layer.

~100 liquid large/mid-cap stocks and ETFs spanning sectors, so historical
matches aren't all drawn from one industry's price behavior. This is a
placeholder basket for development — swap for a licensed data provider's
full/curated universe before any production use, per the data-source
caveat in ingest_yahoo.py.
"""

TICKERS = [
    # Mega-cap tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AVGO", "ORCL", "CRM", "ADBE",
    "CSCO", "AMD", "INTC", "QCOM", "TXN", "IBM", "NOW", "INTU", "AMAT", "MU",
    # Consumer / retail
    "TSLA", "HD", "MCD", "NKE", "SBUX", "TGT", "LOW", "COST", "WMT", "DIS",
    # Financials
    "JPM", "BAC", "WFC", "GS", "MS", "C", "AXP", "BLK", "SCHW", "V", "MA", "PYPL",
    # Healthcare
    "JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "TMO", "ABT", "BMY", "CVS",
    # Industrials / energy
    "XOM", "CVX", "CAT", "BA", "GE", "HON", "UPS", "RTX", "DE", "LMT",
    # Consumer staples
    "KO", "PEP", "PG", "PM", "MO", "CL", "KMB", "GIS",
    # Communications / media
    "NFLX", "CMCSA", "T", "VZ", "TMUS",
    # Broad ETFs
    "SPY", "QQQ", "DIA", "IWM", "VTI", "VOO",
    # Sector ETFs
    "XLK", "XLF", "XLE", "XLV", "XLY", "XLI", "XLP", "XLU", "XLB", "XLRE",
    # Volatility / bonds / international (adds shape diversity)
    "TLT", "GLD", "SLV", "EEM", "EFA", "HYG", "LQD",
    # More liquid mid/large caps
    "UBER", "SHOP", "SQ", "PLTR", "SNOW", "ABNB", "COIN", "RBLX",
]
