import type { BacktestStats, BacktestTrade, Bar } from "@/lib/types";
import { aggregateBars, aggregateSessionBars, sessionResetVwapSeries, utcDateKey, wilderRsi } from "@/lib/indicators";
import { istDateKey, playWindow, sessionVetoReason, type PlayWindow } from "@/lib/session";
import { vixHardVeto, type VixState } from "@/lib/vix";

export const PLAYBOOK = {
  timeframe: "15m" as const,
  rsiLength: 14,
  riskReward: 2,
  touchPct: 0.15,
};

export type PlaybookOpts = {
  clock?: "ist" | "utc";
  nowMs?: number;
  vix?: VixState | null;
};

function dayKey(clock: PlaybookOpts["clock"]) {
  return clock === "utc" ? utcDateKey : istDateKey;
}

export type StepId =
  | "vwap_trend"
  | "price_side"
  | "pullback"
  | "rejection"
  | "rsi"
  | "breakout";

export type ChecklistStep = {
  id: StepId;
  label: string;
  ok: boolean;
};

export type PlaySetup = {
  side: "long" | "short";
  option: "CE" | "PE";
  status: "wait_breakout" | "entry";
  rejectionIndex: number;
  confirmIndex: number | null;
  rejectionTime: number;
  entry: number;
  stop: number;
  target: number;
  risk: number;
};

export type RsiGuide =
  | "strong_bull"
  | "bull"
  | "uncertain"
  | "bear"
  | "strong_bear";

export type PlaybookSnapshot = {
  last: number;
  vwap: number;
  vwapTrend: "rising" | "falling" | "flat";
  priceSide: "above" | "below" | "at";
  rsi: number;
  rsiRising: boolean;
  rsiGuide: RsiGuide;
  rsiGuideLabel: string;
  choppy: boolean;
  avoid: string | null;
  sessionWindow: PlayWindow | null;
  sessionVeto: string | null;
  vix: VixState | null;
  actionable: boolean;
  long: { steps: ChecklistStep[]; ready: boolean };
  short: { steps: ChecklistStep[]; ready: boolean };
  setup: PlaySetup | null;
};

const FIFTEEN = 15 * 60 * 1000;

export function toFifteen(bars5m: Bar[], clock: PlaybookOpts["clock"] = "ist") {
  return clock === "utc" ? aggregateBars(bars5m, FIFTEEN) : aggregateSessionBars(bars5m, FIFTEEN);
}

export function rsiGuide(value: number): { key: RsiGuide; label: string } {
  if (value > 55) return { key: "strong_bull", label: "> 55 Strong bullish momentum" };
  if (value >= 50) return { key: "bull", label: "50–55 Bullish confirmation" };
  if (value >= 45) return { key: "uncertain", label: "45–50 Weak / uncertain" };
  if (value >= 40) return { key: "bear", label: "< 45 Bearish momentum" };
  return { key: "strong_bear", label: "< 40 Strong bearish momentum" };
}

function near(bar: Bar, vwap: number) {
  const pad = vwap * (PLAYBOOK.touchPct / 100);
  return bar.low <= vwap + pad && bar.high >= vwap - pad;
}

function bullRejection(bar: Bar, vwap: number) {
  const range = Math.max(bar.high - bar.low, 1e-9);
  const closeUpper = bar.close - bar.low > 0.5 * range;
  return bar.low <= vwap * (1 + PLAYBOOK.touchPct / 100) && bar.close > vwap && (bar.close >= bar.open || closeUpper);
}

function bearRejection(bar: Bar, vwap: number) {
  const range = Math.max(bar.high - bar.low, 1e-9);
  const closeLower = bar.high - bar.close > 0.5 * range;
  return bar.high >= vwap * (1 - PLAYBOOK.touchPct / 100) && bar.close < vwap && (bar.close <= bar.open || closeLower);
}

function hadPullbackLong(bars: Bar[], vwap: number[], i: number) {
  const from = Math.max(0, i - 6);
  let wasAway = false;
  for (let j = from; j < i; j++) {
    if (bars[j].close > vwap[j] * 1.0015) wasAway = true;
    if (wasAway && near(bars[j], vwap[j])) return true;
  }
  return wasAway && near(bars[i], vwap[i]);
}

function hadPullbackShort(bars: Bar[], vwap: number[], i: number) {
  const from = Math.max(0, i - 6);
  let wasAway = false;
  for (let j = from; j < i; j++) {
    if (bars[j].close < vwap[j] * 0.9985) wasAway = true;
    if (wasAway && near(bars[j], vwap[j])) return true;
  }
  return wasAway && near(bars[i], vwap[i]);
}

function vwapTrendAt(vwap: number[], i: number): PlaybookSnapshot["vwapTrend"] {
  const look = Math.min(3, i);
  if (look < 2) return "flat";
  const delta = vwap[i] - vwap[i - look];
  const thresh = vwap[i] * 0.00015;
  if (delta > thresh) return "rising";
  if (delta < -thresh) return "falling";
  return "flat";
}

function crosses(bars: Bar[], vwap: number[], lookback = 8) {
  const start = Math.max(1, bars.length - lookback);
  let n = 0;
  for (let i = start; i < bars.length; i++) {
    const a = bars[i - 1].close - vwap[i - 1];
    const b = bars[i].close - vwap[i];
    if (a === 0 || b === 0) continue;
    if (a * b < 0) n += 1;
  }
  return n;
}

function findConfirmLong(bars: Bar[], rejection: number, maxAhead = 3) {
  for (let j = rejection + 1; j <= Math.min(bars.length - 1, rejection + maxAhead); j++) {
    if (bars[j].high > bars[rejection].high) return j;
  }
  return null;
}

function findConfirmShort(bars: Bar[], rejection: number, maxAhead = 3) {
  for (let j = rejection + 1; j <= Math.min(bars.length - 1, rejection + maxAhead); j++) {
    if (bars[j].low < bars[rejection].low) return j;
  }
  return null;
}

function longSetupAt(
  bars: Bar[],
  vwap: number[],
  rsi: number[],
  i: number,
): Omit<PlaySetup, "status" | "confirmIndex"> | null {
  if (i < 16) return null;
  const trend = vwapTrendAt(vwap, i);
  const rsiNow = rsi[i];
  const rsiUp = Number.isFinite(rsi[i - 1]) && rsiNow > rsi[i - 1];
  if (trend !== "rising") return null;
  if (bars[i].close <= vwap[i]) return null;
  if (!hadPullbackLong(bars, vwap, i)) return null;
  if (!bullRejection(bars[i], vwap[i])) return null;
  if (!Number.isFinite(rsiNow) || rsiNow <= 50 || !rsiUp) return null;
  const entry = bars[i].high;
  const stop = bars[i].low;
  const risk = entry - stop;
  if (risk <= 0) return null;
  return {
    side: "long",
    option: "CE",
    rejectionIndex: i,
    rejectionTime: bars[i].time,
    entry,
    stop,
    target: entry + PLAYBOOK.riskReward * risk,
    risk,
  };
}

function shortSetupAt(
  bars: Bar[],
  vwap: number[],
  rsi: number[],
  i: number,
): Omit<PlaySetup, "status" | "confirmIndex"> | null {
  if (i < 16) return null;
  const trend = vwapTrendAt(vwap, i);
  const rsiNow = rsi[i];
  const rsiDown = Number.isFinite(rsi[i - 1]) && rsiNow < rsi[i - 1];
  if (trend !== "falling") return null;
  if (bars[i].close >= vwap[i]) return null;
  if (!hadPullbackShort(bars, vwap, i)) return null;
  if (!bearRejection(bars[i], vwap[i])) return null;
  if (!Number.isFinite(rsiNow) || rsiNow >= 50 || !rsiDown) return null;
  const entry = bars[i].low;
  const stop = bars[i].high;
  const risk = stop - entry;
  if (risk <= 0) return null;
  return {
    side: "short",
    option: "PE",
    rejectionIndex: i,
    rejectionTime: bars[i].time,
    entry,
    stop,
    target: entry - PLAYBOOK.riskReward * risk,
    risk,
  };
}

export function evaluatePlaybook(bars5m: Bar[], opts: PlaybookOpts = {}): { bars: Bar[]; vwap: number[]; rsi: number[]; snapshot: PlaybookSnapshot } {
  const clock = opts.clock ?? "ist";
  const bars = toFifteen(bars5m, clock);
  const vwap = sessionResetVwapSeries(bars, dayKey(clock));
  const rsi = wilderRsi(
    bars.map((b) => b.close),
    PLAYBOOK.rsiLength,
  );
  const i = bars.length - 1;
  const empty: PlaybookSnapshot = {
    last: 0,
    vwap: 0,
    vwapTrend: "flat",
    priceSide: "at",
    rsi: 50,
    rsiRising: false,
    rsiGuide: "uncertain",
    rsiGuideLabel: "Not enough 15m bars",
    choppy: false,
    avoid: "Need more 15-minute history.",
    sessionWindow: null,
    sessionVeto: null,
    vix: opts.vix ?? null,
    actionable: false,
    long: { steps: [], ready: false },
    short: { steps: [], ready: false },
    setup: null,
  };
  if (i < 16) return { bars, vwap, rsi, snapshot: empty };

  const trend = vwapTrendAt(vwap, i);
  const last = bars[i];
  const priceSide: PlaybookSnapshot["priceSide"] =
    Math.abs(last.close - vwap[i]) / vwap[i] < 0.0004 ? "at" : last.close > vwap[i] ? "above" : "below";
  const rsiNow = rsi[i];
  const rsiRising = Number.isFinite(rsi[i - 1]) && rsiNow > rsi[i - 1];
  const rsiFalling = Number.isFinite(rsi[i - 1]) && rsiNow < rsi[i - 1];
  const guide = rsiGuide(rsiNow);
  const choppy = crosses(bars, vwap, 8) >= 3 && rsiNow >= 45 && rsiNow <= 55;

  let avoid: string | null = null;
  if (choppy) avoid = "No trade — RSI around 50 and price is chopping through session VWAP.";
  else if (priceSide === "above" && rsiNow < 50 && rsiFalling)
    avoid = "Avoid long — price is above VWAP but RSI is below 50 and falling.";
  else if (priceSide === "below" && rsiNow > 50 && rsiRising)
    avoid = "Avoid short — price is below VWAP but RSI is above 50 and rising.";

  const nowMs = opts.nowMs ?? Date.now();
  const sessionWindow = clock === "ist" ? playWindow(nowMs) : null;
  const sessionVeto = sessionWindow ? sessionVetoReason(sessionWindow, trend, choppy) : null;
  const volVeto = vixHardVeto(opts.vix ?? null, choppy);
  const hardVeto = sessionVeto || volVeto;
  if (hardVeto) avoid = hardVeto;

  const pullL = hadPullbackLong(bars, vwap, i) || (i > 0 && hadPullbackLong(bars, vwap, i - 1));
  const pullS = hadPullbackShort(bars, vwap, i) || (i > 0 && hadPullbackShort(bars, vwap, i - 1));
  const rejL = bullRejection(last, vwap[i]) || (i > 0 && bullRejection(bars[i - 1], vwap[i - 1]));
  const rejS = bearRejection(last, vwap[i]) || (i > 0 && bearRejection(bars[i - 1], vwap[i - 1]));

  let setup: PlaySetup | null = null;
  for (let k = i; k >= Math.max(16, i - 4); k--) {
    const L = longSetupAt(bars, vwap, rsi, k);
    if (L) {
      const confirm = findConfirmLong(bars, k);
      setup = {
        ...L,
        confirmIndex: confirm,
        status: confirm != null ? "entry" : "wait_breakout",
      };
      if (setup.status === "entry") break;
    }
    const S = shortSetupAt(bars, vwap, rsi, k);
    if (S) {
      const confirm = findConfirmShort(bars, k);
      const next: PlaySetup = {
        ...S,
        confirmIndex: confirm,
        status: confirm != null ? "entry" : "wait_breakout",
      };
      if (!setup || next.status === "entry") setup = next;
      if (setup.status === "entry") break;
    }
  }

  const longBreak = setup?.side === "long" && setup.status === "entry";
  const shortBreak = setup?.side === "short" && setup.status === "entry";

  const longSteps: ChecklistStep[] = [
    { id: "vwap_trend", label: "VWAP rising", ok: trend === "rising" },
    { id: "price_side", label: "Price above VWAP", ok: priceSide === "above" },
    { id: "pullback", label: "Pullback toward VWAP", ok: pullL },
    { id: "rejection", label: "Bullish VWAP rejection candle", ok: rejL },
    { id: "rsi", label: "RSI > 50 and rising", ok: rsiNow > 50 && rsiRising },
    { id: "breakout", label: "Break of rejection high", ok: longBreak },
  ];
  const shortSteps: ChecklistStep[] = [
    { id: "vwap_trend", label: "VWAP falling", ok: trend === "falling" },
    { id: "price_side", label: "Price below VWAP", ok: priceSide === "below" },
    { id: "pullback", label: "Pullback toward VWAP", ok: pullS },
    { id: "rejection", label: "Bearish VWAP rejection candle", ok: rejS },
    { id: "rsi", label: "RSI < 50 and falling", ok: rsiNow < 50 && rsiFalling },
    { id: "breakout", label: "Break of rejection low", ok: shortBreak },
  ];

  return {
    bars,
    vwap,
    rsi,
    snapshot: {
      last: last.close,
      vwap: vwap[i],
      vwapTrend: trend,
      priceSide,
      rsi: rsiNow,
      rsiRising,
      rsiGuide: guide.key,
      rsiGuideLabel: guide.label,
      choppy,
      avoid,
      sessionWindow,
      sessionVeto,
      vix: opts.vix ?? null,
      actionable: !hardVeto && !choppy,
      long: { steps: longSteps, ready: !hardVeto && longSteps.every((s) => s.ok) },
      short: { steps: shortSteps, ready: !hardVeto && shortSteps.every((s) => s.ok) },
      setup: choppy && !hardVeto ? null : setup,
    },
  };
}

export function backtestPlaybook(bars5m: Bar[], opts: PlaybookOpts = {}): BacktestStats {
  const clock = opts.clock ?? "ist";
  const keyFn = dayKey(clock);
  const bars = toFifteen(bars5m, clock);
  const vwap = sessionResetVwapSeries(bars, keyFn);
  const rsi = wilderRsi(
    bars.map((b) => b.close),
    PLAYBOOK.rsiLength,
  );
  const trades: BacktestTrade[] = [];
  let i = 16;
  while (i < bars.length - 1) {
    const L = longSetupAt(bars, vwap, rsi, i);
    const S = !L ? shortSetupAt(bars, vwap, rsi, i) : null;
    const raw = L ?? S;
    if (!raw) {
      i += 1;
      continue;
    }
    const confirm = raw.side === "long" ? findConfirmLong(bars, i) : findConfirmShort(bars, i);
    if (confirm == null) {
      i += 1;
      continue;
    }
    const entryBar = bars[confirm];
    const entry = raw.side === "long" ? Math.max(raw.entry, entryBar.open) : Math.min(raw.entry, entryBar.open);
    const stop = raw.stop;
    const risk = Math.abs(entry - stop);
    const target = raw.side === "long" ? entry + PLAYBOOK.riskReward * risk : entry - PLAYBOOK.riskReward * risk;
    const session = keyFn(entryBar.time);
    let exit = entryBar.close;
    let exitTime = entryBar.time;
    let reason = "time";
    for (let j = confirm; j < bars.length && keyFn(bars[j].time) === session; j++) {
      const bar = bars[j];
      if (raw.side === "long") {
        if (bar.low <= stop) {
          exit = stop;
          exitTime = bar.time;
          reason = "stop";
          break;
        }
        if (bar.high >= target) {
          exit = target;
          exitTime = bar.time;
          reason = "target";
          break;
        }
      } else {
        if (bar.high >= stop) {
          exit = stop;
          exitTime = bar.time;
          reason = "stop";
          break;
        }
        if (bar.low <= target) {
          exit = target;
          exitTime = bar.time;
          reason = "target";
          break;
        }
      }
      exit = bar.close;
      exitTime = bar.time;
      reason = "time";
    }
    const pnlPts = raw.side === "long" ? exit - entry : entry - exit;
    trades.push({
      entryTime: entryBar.time,
      exitTime,
      side: raw.side,
      entry,
      exit,
      stop,
      pnlPts,
      pnlR: risk === 0 ? 0 : pnlPts / risk,
      reason,
      result: pnlPts >= 0 ? "win" : "loss",
    });
    i = confirm + 2;
  }

  const wins = trades.filter((t) => t.result === "win");
  const losses = trades.filter((t) => t.result === "loss");
  const grossWin = wins.reduce((a, t) => a + t.pnlPts, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnlPts, 0));
  let eq = 0;
  let peak = 0;
  let maxDd = 0;
  for (const t of trades) {
    eq += t.pnlR;
    peak = Math.max(peak, eq);
    maxDd = Math.max(maxDd, peak - eq);
  }
  return {
    trades,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    expectancyR: trades.length ? trades.reduce((a, t) => a + t.pnlR, 0) / trades.length : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : grossWin / grossLoss,
    netPts: trades.reduce((a, t) => a + t.pnlPts, 0),
    maxDrawdownR: maxDd,
    avgHoldBars: trades.length
      ? trades.reduce((a, t) => a + Math.max(1, Math.round((t.exitTime - t.entryTime) / FIFTEEN)), 0) / trades.length
      : 0,
  };
}
