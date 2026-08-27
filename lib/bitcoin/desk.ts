import type { Bar, DataSource, Instrument, Timeframe, WatchlistRow } from "@/lib/types";
import { TIMEFRAMES } from "@/lib/universe";
import { aggregateBars, utcDateKey } from "@/lib/indicators";
import { snapshotFromBars } from "@/lib/signals";
import { fetchBtcFiveMinute } from "@/lib/bitcoin/feed";
import { flattenBars, generateHistory } from "@/lib/simulate";
import { evaluatePlaybook, backtestPlaybook } from "@/lib/playbook";
import { createSWR } from "@/lib/swr";

export const BTC: Instrument = {
  symbol: "BTCUSDT",
  name: "Bitcoin / USDT",
  kind: "crypto",
  lotSize: 1,
  basePrice: 110000,
};

const TF_MS: Record<Exclude<Timeframe, "1D">, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

function utcDayStart(ms: number) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dailyUtc(all: Bar[]): Bar[] {
  const byDay = new Map<string, Bar>();
  for (const bar of all) {
    const day = utcDateKey(bar.time);
    const existing = byDay.get(day);
    if (!existing) byDay.set(day, { ...bar });
    else {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    }
  }
  return [...byDay.values()];
}

function barsForTf(all: Bar[], tf: Timeframe): Bar[] {
  if (tf === "5m") return all;
  if (tf === "1D") return dailyUtc(all);
  return aggregateBars(all, TF_MS[tf]);
}

function snapshot(all: Bar[], tf: Timeframe) {
  const bars = barsForTf(all, tf);
  const start = utcDayStart(bars.at(-1)?.time ?? Date.now());
  const sessionBars = tf === "1D" ? bars.slice(-90) : bars.filter((b) => b.time >= start);
  const use = tf === "1D" ? bars : sessionBars.length > 20 ? sessionBars : bars.slice(-80);
  return { timeframe: tf, ...snapshotFromBars(use) };
}

export type BtcDesk = {
  source: DataSource;
  sourceNote: string;
  instrument: Instrument;
  bars: Bar[];
  row: WatchlistRow;
};

function simulatedBtc(nowMs: number, note: string): BtcDesk {
  const bars = flattenBars(generateHistory(BTC, nowMs));
  const timeframes = Object.fromEntries(TIMEFRAMES.map((tf) => [tf, snapshot(bars, tf)])) as WatchlistRow["timeframes"];
  return {
    source: "simulated",
    sourceNote: note,
    instrument: BTC,
    bars,
    row: { instrument: BTC, pcr: null, pcrBias: null, timeframes, composite: "flat" },
  };
}

const btcCache = createSWR<BtcDesk>(8_000, 60_000);

export async function loadBitcoinDesk(nowMs = Date.now()): Promise<BtcDesk> {
  return btcCache.getOrLoad("BTCUSDT", nowMs, async () => {
    try {
      const { bars, source } = await fetchBtcFiveMinute(nowMs);
      const timeframes = Object.fromEntries(TIMEFRAMES.map((tf) => [tf, snapshot(bars, tf)])) as WatchlistRow["timeframes"];
      const sides = TIMEFRAMES.map((tf) => timeframes[tf].confluence.side);
      const longs = sides.filter((s) => s === "long").length;
      const shorts = sides.filter((s) => s === "short").length;
      const composite =
        longs >= 3 && shorts === 0 ? "long" : shorts >= 3 && longs === 0 ? "short" : longs && shorts ? "mixed" : "flat";
      return {
        source: "binance" as const,
        sourceNote: `Live ${source} BTCUSDT 5m candles · UTC-day VWAP`,
        instrument: BTC,
        bars,
        row: { instrument: BTC, pcr: null, pcrBias: null, timeframes, composite },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bitcoin feed failed";
      return simulatedBtc(nowMs, `Bitcoin fallback: ${message}`);
    }
  });
}

export function btcPlaybook(bars: Bar[]) {
  return evaluatePlaybook(bars, { clock: "utc" });
}

export function btcBacktest(bars: Bar[]) {
  return backtestPlaybook(bars, { clock: "utc" });
}
