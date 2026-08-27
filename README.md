# Nifty VWAP + RSI desk

Research desk for Nifty 50, Bank Nifty, and ATM option strikes. It combines session VWAP (with 1/2/3σ bands) and RSI so you can scan confluence, fade extremes, confirm trend with an anchored VWAP, and backtest the reclaim rule.

## Data

**Upstox is the live source.** Connect on `/connect` (paste an access token, or OAuth with API key + secret). The desk then pulls:

- 5-minute historical + intraday candles (v3)
- Weekly option chain for ATM CE/PE and PCR (index windows)
- LTP quotes every few seconds (indexes, ATM options, India VIX)

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
| **VWAP map** | Session fair value, PD/PW/PM VWAP closes as magnets, fade-into-VWAP context, anchored add/don’t-add, large-print (t-size) VWAP |
| **Nifty / Bank Nifty / Sensex windows** | Pop-outs: live LTP, 15m chart, CE/PE checklist, ATM rupee risk, India VIX, session veto. Entry / SL / target on the same screen. |
| **Bitcoin** | Isolated BTCUSDT desk: UTC-day VWAP, MTF RSI, and Long/Short entry · stop · 1:2 target on the same screen |
| **Stocks desk** | Combined Nifty 50 stocks MTF watchlist |
| **Mean reversion** | Names >2% from VWAP with RSI &lt;30 or &gt;70 |
| **Anchored VWAP** | Session open, weekly open, or largest gap, with RSI slope |
| **Confluence** | VWAP reclaim/reject aligned with RSI divergence or slope |
| **Backtest** | VWAP-reclaim entries, RSI gates, ATR stop, R-multiple target |
| **Upstox** | Token / OAuth connect |
| **Pine** | `pine/vwap-rsi-confluence.pine` and `pine/vwap-rsi-15m-rejection.pine` |

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Deploy on Cloudflare

This is a Next.js server app (API routes + Upstox/Binance fetches). It ships to **Cloudflare Workers** via OpenNext.

1. Install the [Wrangler CLI login](https://developers.cloudflare.com/workers/wrangler/install-and-update/):

```bash
npx wrangler login
```

2. Put secrets on the Worker (never commit tokens):

```bash
npx wrangler secret put UPSTOX_ACCESS_TOKEN
npx wrangler secret put UPSTOX_API_KEY
npx wrangler secret put UPSTOX_API_SECRET
```

3. Deploy:

```bash
npm run deploy
```

That prints a `*.workers.dev` URL. Add the same origin as the Upstox redirect:

```bash
npx wrangler secret put UPSTOX_REDIRECT_URI
# value: https://nifty-vwap-desk.<your-subdomain>.workers.dev/api/upstox/callback
```

Register that callback on the Upstox developer app. Redeploy is not required after changing secrets; refresh `/connect` if the token was only in cookies.

Local Workers preview (same runtime as production):

```bash
cp .dev.vars.example .dev.vars   # fill tokens; file is gitignored
npm run preview
```

Without a token the live simulator still loads. Not investment advice.
