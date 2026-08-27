import type { Bar, Instrument } from "@/lib/types";
import { gaussian, hashString, mulberry32 } from "@/lib/rng";
import { isWeekendIst, istWallToUtc, previousSessionMs, toIstParts } from "@/lib/session";

export type Scenario =
  | "trend_up"
  | "trend_down"
  | "fade_long"
  | "fade_short"
  | "reclaim_long"
  | "reclaim_short"
  | "chop";

export function scenarioFor(symbol: string, seedDate: string): Scenario {
  const scenarios: Scenario[] = [
    "trend_up",
    "trend_down",
    "fade_long",
    "fade_short",
    "reclaim_long",
    "reclaim_short",
    "chop",
  ];
  const i = hashString(`${symbol}:${seedDate}`) % scenarios.length;
  return scenarios[i];
}

function sessionMinutes(): { h: number; m: number }[] {
  const out: { h: number; m: number }[] = [];
  let h = 9;
  let m = 15;
  while (h < 15 || (h === 15 && m <= 25)) {
    out.push({ h, m });
    m += 5;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return out;
}

const INTRADAY = sessionMinutes();

function volProfile(i: number, n: number) {
  const open = Math.exp(-(((i - 2) / 8) ** 2));
  const close = Math.exp(-(((i - (n - 4)) / 10) ** 2));
  const lunch = 1 - 0.45 * Math.exp(-(((i - n * 0.45) / 12) ** 2));
  return 0.55 + open * 1.4 + close * 1.1 + lunch;
}

export function generateSessionBars(
  instrument: Instrument,
  sessionMs: number,
  scenario: Scenario,
  prevClose: number,
): Bar[] {
  const p = toIstParts(sessionMs);
  const seed = hashString(`${instrument.symbol}:${p.year}-${p.month}-${p.date}:${scenario}`);
  const rand = mulberry32(seed);
  const bars: Bar[] = [];
  let price = prevClose * (1 + (rand() - 0.5) * 0.004);
  const n = INTRADAY.length;
  const targetEnd =
    scenario === "trend_up" || scenario === "reclaim_long"
      ? 0.012
      : scenario === "trend_down" || scenario === "reclaim_short"
        ? -0.012
        : scenario === "fade_short"
          ? 0.026
          : scenario === "fade_long"
            ? -0.026
            : (rand() - 0.5) * 0.006;

  for (let i = 0; i < n; i++) {
    const t = istWallToUtc(p.year, p.month, p.date, INTRADAY[i].h, INTRADAY[i].m);
    const progress = i / (n - 1);
    let drift = targetEnd / n;
    if (scenario === "reclaim_long") {
      drift = progress < 0.62 ? -0.00028 : 0.00055;
    } else if (scenario === "reclaim_short") {
      drift = progress < 0.62 ? 0.00028 : -0.00055;
    } else if (scenario === "fade_short") {
      drift = progress < 0.78 ? 0.00072 : -0.00015;
    } else if (scenario === "fade_long") {
      drift = progress < 0.78 ? -0.00072 : 0.00015;
    }
    const noise = gaussian(rand) * instrument.basePrice * 0.00055;
    const open = price;
    const close = Math.max(0.05, open * (1 + drift) + noise);
    const high = Math.max(open, close) + Math.abs(gaussian(rand)) * instrument.basePrice * 0.00035;
    let low = Math.min(open, close) - Math.abs(gaussian(rand)) * instrument.basePrice * 0.00035;
    if (low <= 0) low = close * 0.995;
    const volume = Math.round(
      (instrument.kind === "option" ? 18000 : instrument.kind === "index" ? 420000 : 85000) *
        volProfile(i, n) *
        (0.7 + rand()),
    );
    bars.push({ time: t, open, high, low, close, volume });
    price = close;
  }
  return bars;
}

export function generateHistory(instrument: Instrument, nowMs: number, sessions = 18) {
  let cursor = nowMs;
  const days: { dateMs: number; bars: Bar[] }[] = [];
  let prevClose = instrument.basePrice;
  const collected: { dateMs: number }[] = [];
  while (collected.length < sessions) {
    if (!isWeekendIst(cursor)) collected.push({ dateMs: sessionAnchor(cursor) });
    cursor = previousSessionMs(cursor);
  }
  collected.reverse();
  const forcedToday: Partial<Record<string, Scenario>> = {
    HDFCBANK: "fade_long",
    TATAMOTORS: "fade_long",
    ITC: "fade_long",
    BAJFINANCE: "fade_short",
    MARUTI: "fade_short",
    RELIANCE: "reclaim_long",
    INFY: "reclaim_short",
    NIFTY: "trend_up",
    BANKNIFTY: "chop",
  };
  for (let d = 0; d < collected.length; d++) {
    const day = collected[d];
    const key = `${day.dateMs}`;
    const scenario =
      d === collected.length - 1 && forcedToday[instrument.symbol]
        ? forcedToday[instrument.symbol]!
        : scenarioFor(instrument.symbol, key);
    const bars = generateSessionBars(instrument, day.dateMs, scenario, prevClose);
    days.push({ dateMs: day.dateMs, bars });
    prevClose = bars.at(-1)?.close ?? prevClose;
  }
  return days;
}

function sessionAnchor(ms: number) {
  const p = toIstParts(ms);
  return istWallToUtc(p.year, p.month, p.date, 12, 0);
}

export function flattenBars(history: { bars: Bar[] }[]) {
  return history.flatMap((d) => d.bars);
}

export function pcrFor(symbol: string, nowMs: number) {
  const rand = mulberry32(hashString(`pcr:${symbol}:${Math.floor(nowMs / 300000)}`));
  const pcr = 0.72 + rand() * 0.78;
  const bias = pcr < 0.9 ? "bullish" : pcr > 1.15 ? "bearish" : "neutral";
  return { pcr, bias: bias as "bullish" | "bearish" | "neutral" };
}
