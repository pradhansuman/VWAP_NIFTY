import type { Bar, Divergence, RsiState, VwapState } from "@/lib/types";
import { istDateKey, sessionOpenUtc } from "@/lib/session";

export function typicalPrice(bar: Bar) {
  return (bar.high + bar.low + bar.close) / 3;
}

export function sessionVwap(bars: Bar[]): VwapState {
  return anchoredVwap(bars, 0);
}

export function anchoredVwap(bars: Bar[], fromIndex: number): VwapState {
  let pv = 0;
  let vol = 0;
  let m2 = 0;
  for (let i = Math.max(0, fromIndex); i < bars.length; i++) {
    const tp = typicalPrice(bars[i]);
    const v = Math.max(1, bars[i].volume);
    pv += tp * v;
    vol += v;
    const mean = pv / vol;
    m2 += v * (tp - mean) * (tp - mean);
  }
  const last = bars.at(-1)?.close ?? 0;
  const vwap = vol > 0 ? pv / vol : last;
  const stdev = vol > 0 ? Math.sqrt(m2 / vol) : 0;
  const deviationPct = vwap === 0 ? 0 : ((last - vwap) / vwap) * 100;
  const position = Math.abs(deviationPct) < 0.05 ? "at" : last >= vwap ? "above" : "below";
  return {
    vwap,
    stdev,
    band1Upper: vwap + stdev,
    band1Lower: vwap - stdev,
    band2Upper: vwap + 2 * stdev,
    band2Lower: vwap - 2 * stdev,
    band3Upper: vwap + 3 * stdev,
    band3Lower: vwap - 3 * stdev,
    deviationPct,
    position,
  };
}

export function vwapSeries(bars: Bar[], fromIndex = 0): number[] {
  const out: number[] = [];
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i < fromIndex) {
      out.push(Number.NaN);
      continue;
    }
    const tp = typicalPrice(bars[i]);
    const v = Math.max(1, bars[i].volume);
    pv += tp * v;
    vol += v;
    out.push(pv / vol);
  }
  return out;
}

export function wilderRsi(closes: number[], period = 14): number[] {
  const rsi = Array(closes.length).fill(Number.NaN);
  if (closes.length <= period) return rsi;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function lastFinite(values: number[]) {
  for (let i = values.length - 1; i >= 0; i--) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return 50;
}

export function rsiState(bars: Bar[], period = 14, slopeLookback = 5): RsiState {
  const rsi = wilderRsi(bars.map((b) => b.close), period);
  const value = lastFinite(rsi);
  const slice = rsi.filter(Number.isFinite).slice(-slopeLookback);
  let slope = 0;
  if (slice.length >= 2) {
    const n = slice.length;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sx2 = 0;
    for (let i = 0; i < n; i++) {
      sx += i;
      sy += slice[i];
      sxy += i * slice[i];
      sx2 += i * i;
    }
    slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sx2 - sx * sx);
  }
  const trend = slope > 0.35 ? "rising" : slope < -0.35 ? "falling" : "flat";
  const zone = value >= 70 ? "overbought" : value <= 30 ? "oversold" : "neutral";
  return { value, slope, trend, zone };
}

function swingLows(values: number[], lookback = 3) {
  const idx: number[] = [];
  for (let i = lookback; i < values.length - lookback; i++) {
    let low = true;
    for (let j = 1; j <= lookback; j++) {
      if (values[i] > values[i - j] || values[i] > values[i + j]) {
        low = false;
        break;
      }
    }
    if (low) idx.push(i);
  }
  return idx;
}

function swingHighs(values: number[], lookback = 3) {
  const idx: number[] = [];
  for (let i = lookback; i < values.length - lookback; i++) {
    let high = true;
    for (let j = 1; j <= lookback; j++) {
      if (values[i] < values[i - j] || values[i] < values[i + j]) {
        high = false;
        break;
      }
    }
    if (high) idx.push(i);
  }
  return idx;
}

export function detectDivergence(bars: Bar[], period = 14): Divergence {
  const closes = bars.map((b) => b.close);
  const rsi = wilderRsi(closes, period);
  const start = rsi.findIndex(Number.isFinite);
  if (start < 0 || bars.length < 30) {
    return { type: "none", confirmed: false, note: "Not enough bars for divergence." };
  }
  const window = bars.slice(-60);
  const rsiWindow = rsi.slice(-60);
  const priceLows = swingLows(window.map((b) => b.low));
  const priceHighs = swingHighs(window.map((b) => b.high));
  if (priceLows.length >= 2) {
    const a = priceLows.at(-2)!;
    const b = priceLows.at(-1)!;
    if (window[b].low < window[a].low && rsiWindow[b] > rsiWindow[a] + 2) {
      return {
        type: "bullish",
        confirmed: true,
        note: "Price made a lower low while RSI made a higher low.",
      };
    }
  }
  if (priceHighs.length >= 2) {
    const a = priceHighs.at(-2)!;
    const b = priceHighs.at(-1)!;
    if (window[b].high > window[a].high && rsiWindow[b] < rsiWindow[a] - 2) {
      return {
        type: "bearish",
        confirmed: true,
        note: "Price made a higher high while RSI made a lower high.",
      };
    }
  }
  return { type: "none", confirmed: false, note: "No regular RSI divergence on the last 60 bars." };
}

export function reclaimVwap(bars: Bar[], vwap: number[]) {
  if (bars.length < 2) return "none" as const;
  const prev = bars[bars.length - 2].close;
  const last = bars[bars.length - 1].close;
  const prevV = vwap[vwap.length - 2];
  const lastV = vwap[vwap.length - 1];
  if (!Number.isFinite(prevV) || !Number.isFinite(lastV)) return "none" as const;
  if (prev < prevV && last >= lastV) return "long" as const;
  if (prev > prevV && last <= lastV) return "short" as const;
  return "none" as const;
}

export function aggregateBars(bars: Bar[], sizeMs: number): Bar[] {
  const out: Bar[] = [];
  let bucket: Bar | null = null;
  let bucketStart = 0;
  for (const bar of bars) {
    const start = Math.floor(bar.time / sizeMs) * sizeMs;
    if (!bucket || start !== bucketStart) {
      if (bucket) out.push(bucket);
      bucketStart = start;
      bucket = { ...bar, time: start };
    } else {
      bucket.high = Math.max(bucket.high, bar.high);
      bucket.low = Math.min(bucket.low, bar.low);
      bucket.close = bar.close;
      bucket.volume += bar.volume;
    }
  }
  if (bucket) out.push(bucket);
  return out;
}

/** 15-minute (or other) buckets aligned to the 09:15 IST session open. */
export function aggregateSessionBars(bars: Bar[], sizeMs: number): Bar[] {
  const out: Bar[] = [];
  let bucket: Bar | null = null;
  let bucketStart = 0;
  for (const bar of bars) {
    const open = sessionOpenUtc(bar.time);
    const offset = Math.max(0, bar.time - open);
    const start = open + Math.floor(offset / sizeMs) * sizeMs;
    if (!bucket || start !== bucketStart) {
      if (bucket) out.push(bucket);
      bucketStart = start;
      bucket = { ...bar, time: start };
    } else {
      bucket.high = Math.max(bucket.high, bar.high);
      bucket.low = Math.min(bucket.low, bar.low);
      bucket.close = bar.close;
      bucket.volume += bar.volume;
    }
  }
  if (bucket) out.push(bucket);
  return out;
}

export function sessionResetVwapSeries(bars: Bar[]): number[] {
  const out: number[] = [];
  let pv = 0;
  let vol = 0;
  let day = "";
  for (const bar of bars) {
    const key = istDateKey(bar.time);
    if (key !== day) {
      day = key;
      pv = 0;
      vol = 0;
    }
    const tp = typicalPrice(bar);
    const v = Math.max(1, bar.volume);
    pv += tp * v;
    vol += v;
    out.push(pv / vol);
  }
  return out;
}

export function atr(bars: Bar[], period = 14) {
  if (bars.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prev),
      Math.abs(bars[i].low - prev),
    );
    trs.push(tr);
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}
