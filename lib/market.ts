import type { Bar, Instrument, Timeframe, TimeframeSnapshot, WatchlistRow } from "@/lib/types";
import { TIMEFRAMES, UNIVERSE, getInstrument } from "@/lib/universe";
import { aggregateBars } from "@/lib/indicators";
import { flattenBars, generateHistory, pcrFor, scenarioFor } from "@/lib/simulate";
import { meanReversionSide, snapshotFromBars } from "@/lib/signals";
import { sessionOpenUtc, weekOpenUtc } from "@/lib/session";

const TF_MS: Record<Exclude<Timeframe, "1D">, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

function dailyBars(all: Bar[]): Bar[] {
  const byDay = new Map<string, Bar>();
  for (const bar of all) {
    const day = new Date(bar.time + 5.5 * 3600000).toISOString().slice(0, 10);
    const existing = byDay.get(day);
    if (!existing) {
      byDay.set(day, { ...bar });
    } else {
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
  if (tf === "1D") return dailyBars(all);
  return aggregateBars(all, TF_MS[tf]);
}

function snapshot(all: Bar[], tf: Timeframe): TimeframeSnapshot {
  const bars = barsForTf(all, tf);
  const sessionBars =
    tf === "1D" ? bars.slice(-60) : bars.filter((b) => b.time >= sessionOpenUtc(bars.at(-1)?.time ?? Date.now()));
  const use = tf === "1D" ? bars : sessionBars.length > 20 ? sessionBars : bars.slice(-80);
  const snap = snapshotFromBars(use);
  return { timeframe: tf, ...snap };
}

export function buildRows(
  series: { instrument: Instrument; bars: Bar[] }[],
  pcr: number | null,
  pcrBias: WatchlistRow["pcrBias"],
  pcrOn: (instrument: Instrument) => boolean = (instrument) => instrument.kind === "index",
): WatchlistRow[] {
  return series.map(({ instrument, bars }) => {
    const timeframes = Object.fromEntries(TIMEFRAMES.map((tf) => [tf, snapshot(bars, tf)])) as WatchlistRow["timeframes"];
    const sides = TIMEFRAMES.map((tf) => timeframes[tf].confluence.side);
    const longs = sides.filter((s) => s === "long").length;
    const shorts = sides.filter((s) => s === "short").length;
    const composite =
      longs >= 3 && shorts === 0 ? "long" : shorts >= 3 && longs === 0 ? "short" : longs && shorts ? "mixed" : "flat";
    const showPcr = pcrOn(instrument);
    return {
      instrument,
      pcr: showPcr ? pcr : null,
      pcrBias: showPcr ? pcrBias : null,
      timeframes,
      composite,
    };
  });
}

export function getHistory(symbol: string, nowMs = Date.now()) {
  const instrument = getInstrument(symbol);
  if (!instrument) return null;
  const history = generateHistory(instrument, nowMs);
  return { instrument, history, bars: flattenBars(history) };
}

export function getWatchlist(nowMs = Date.now()): WatchlistRow[] {
  return UNIVERSE.map((instrument) => {
    const bars = flattenBars(generateHistory(instrument, nowMs));
    const { pcr, bias } = instrument.kind === "index" ? pcrFor(instrument.symbol, nowMs) : { pcr: null, bias: null };
    return buildRows([{ instrument, bars }], pcr, bias)[0];
  });
}

export function getScanner(rows?: WatchlistRow[], nowMs = Date.now()) {
  const list = rows ?? getWatchlist(nowMs);
  return list
    .map((row) => {
      const tf = row.timeframes["5m"];
      const side = meanReversionSide(tf.vwap.deviationPct, tf.rsi.value);
      if (!side) return null;
      const abs = Math.abs(tf.vwap.deviationPct);
      return {
        instrument: row.instrument,
        last: tf.last,
        vwap: tf.vwap.vwap,
        deviationPct: tf.vwap.deviationPct,
        rsi: tf.rsi.value,
        side,
        setup:
          side === "fade_long"
            ? "Price >2% below VWAP with RSI oversold — mean-reversion long fade."
            : "Price >2% above VWAP with RSI overbought — mean-reversion short fade.",
        band: abs >= 3 ? ("3σ" as const) : abs >= 2 ? (">2%" as const) : ("2σ" as const),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}

export function chartFromBars(
  pack: { instrument: Instrument; bars: Bar[] },
  anchor: "session" | "week" | "gap" = "session",
  nowMs = Date.now(),
) {
  const bars = pack.bars.slice(-400);
  const lastTime = bars.at(-1)?.time ?? nowMs;
  let fromIndex = 0;
  if (anchor === "session") {
    const open = sessionOpenUtc(lastTime);
    fromIndex = Math.max(0, bars.findIndex((b) => b.time >= open));
  } else if (anchor === "week") {
    const open = weekOpenUtc(lastTime);
    fromIndex = Math.max(0, bars.findIndex((b) => b.time >= open));
  } else {
    let best = 0;
    let bestGap = 0;
    for (let i = 1; i < bars.length; i++) {
      const gap = Math.abs(bars[i].open - bars[i - 1].close) / bars[i - 1].close;
      if (gap > bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    fromIndex = best;
  }
  return {
    instrument: pack.instrument,
    bars,
    fromIndex,
    scenario: scenarioFor(pack.instrument.symbol, String(lastTime)),
  };
}

export function getChart(symbol: string, nowMs = Date.now(), anchor: "session" | "week" | "gap" = "session") {
  const pack = getHistory(symbol, nowMs);
  if (!pack) return null;
  return chartFromBars(pack, anchor, nowMs);
}

export function niftyTape(rows: WatchlistRow[], nowMs = Date.now()) {
  const nifty = rows.find((r) => r.instrument.symbol === "NIFTY") ?? rows[0];
  const bank = rows.find((r) => r.instrument.symbol === "BANKNIFTY") ?? nifty;
  if (!nifty) {
    throw new Error("Watchlist is empty");
  }
  return {
    nifty: nifty.timeframes["5m"],
    bank: bank.timeframes["5m"],
    pcr: nifty.pcr ?? 1,
    pcrBias: nifty.pcrBias ?? "neutral",
    generatedAt: nowMs,
  };
}
