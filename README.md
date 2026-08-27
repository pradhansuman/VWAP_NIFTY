# Nifty VWAP + RSI desk

Research desk for Nifty 50, Bank Nifty, and a couple of ATM option strikes. It combines session VWAP (with 1/2/3σ bands) and RSI so you can scan confluence, fade extremes, confirm trend with an anchored VWAP, and backtest the reclaim rule before you take it to TradingView.

Data is a **deterministic NSE-session simulator** (9:15–15:30 IST). No HDFC/broker API key is required. Swap the generator in `lib/simulate.ts` for live candles when you wire a broker.

## What is in here

| Surface | What it does |
| --- | --- |
| **MTF desk** | VWAP distance + RSI across 5m / 15m / 1h / daily, color-coded, plus PCR bias |
| **Mean reversion** | Names >2% from VWAP with RSI &lt;30 or &gt;70 |
| **Anchored VWAP** | Session open, weekly open, or largest gap, with RSI slope (continuation vs exhaustion) |
| **Confluence** | VWAP reclaim/reject aligned with RSI divergence or slope |
| **Backtest** | VWAP-reclaim entries, RSI gates, ATR stop, R-multiple target, win-rate / expectancy |
| **Pine** | `pine/vwap-rsi-confluence.pine` for TradingView |

## Run locally

```bash
npm install
npm run dev -- --port 43127
```

Open [http://localhost:43127](http://localhost:43127).

```bash
npm run build
npm start -- --port 43127
```

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.

Not investment advice. Simulated quotes will not match the live NSE tape.
