# Nifty VWAP + RSI desk

Research desk for Nifty 50, Bank Nifty, and ATM option strikes. It combines session VWAP (with 1/2/3σ bands) and RSI so you can scan confluence, fade extremes, confirm trend with an anchored VWAP, and backtest the reclaim rule.

## Data

**Upstox is the live source.** Connect on `/connect` (paste an access token, or OAuth with API key + secret). The desk then pulls:

- 5-minute historical + intraday candles (v3)
- Weekly Nifty option chain for ATM CE/PE and PCR

If there is no token, or Upstox errors, it **falls back to the IST session simulator** so the UI still works.

```bash
# .env.local  (never commit this)
UPSTOX_API_KEY=
UPSTOX_API_SECRET=
UPSTOX_ACCESS_TOKEN=
UPSTOX_REDIRECT_URI=http://127.0.0.1:43127/api/upstox/callback
```

Register that redirect URI on the Upstox developer app. Access tokens from the standard OAuth flow expire daily; an analytics token can stay on longer for market data.

## What is in here

| Surface | What it does |
| --- | --- |
| **Nifty** | `/nifty` tape plus **Open window** — pops a dedicated Nifty 50 browser window (`/window/nifty`) |
| **Bank Nifty** | `/banknifty` plus a separate window (`/window/banknifty`) so the two indexes are not mixed |
| **Stocks desk** | Combined Nifty 50 stocks MTF watchlist |
| **Mean reversion** | Names >2% from VWAP with RSI &lt;30 or &gt;70 |
| **Anchored VWAP** | Session open, weekly open, or largest gap, with RSI slope |
| **Confluence** | VWAP reclaim/reject aligned with RSI divergence or slope |
| **Bitcoin** | Isolated BTCUSDT desk: UTC VWAP, MTF RSI, 15m long/short playbook |
| **Backtest** | VWAP-reclaim entries, RSI gates, ATR stop, R-multiple target |
| **Upstox** | Token / OAuth connect |
| **Pine** | `pine/vwap-rsi-confluence.pine` and `pine/vwap-rsi-15m-rejection.pine` |

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Not investment advice.
