import type { BacktestStats, BacktestTrade, Bar } from "@/lib/types";
import { atr, reclaimVwap, sessionVwap, vwapSeries, wilderRsi } from "@/lib/indicators";

export type BacktestParams = {
  rsiPeriod: number;
  rsiLongMax: number;
  rsiShortMin: number;
  stopAtrMult: number;
  targetR: number;
  maxHoldBars: number;
};

export const DEFAULT_BACKTEST: BacktestParams = {
  rsiPeriod: 14,
  rsiLongMax: 45,
  rsiShortMin: 55,
  stopAtrMult: 1.2,
  targetR: 1.5,
  maxHoldBars: 12,
};

export function runBacktest(bars: Bar[], params: BacktestParams = DEFAULT_BACKTEST): BacktestStats {
  const rsi = wilderRsi(bars.map((b) => b.close), params.rsiPeriod);
  const vwap = vwapSeries(bars);
  const trades: BacktestTrade[] = [];
  let i = 20;
  while (i < bars.length - 2) {
    const slice = bars.slice(0, i + 1);
    const reclaim = reclaimVwap(slice, vwap.slice(0, i + 1));
    const rsiNow = rsi[i];
    const volAtr = atr(slice, 14);
    if (!Number.isFinite(rsiNow) || volAtr <= 0) {
      i += 1;
      continue;
    }
    let side: "long" | "short" | null = null;
    if (reclaim === "long" && rsiNow <= params.rsiLongMax) side = "long";
    if (reclaim === "short" && rsiNow >= params.rsiShortMin) side = "short";
    if (!side) {
      i += 1;
      continue;
    }
    const entry = bars[i].close;
    const stop = side === "long" ? entry - params.stopAtrMult * volAtr : entry + params.stopAtrMult * volAtr;
    const risk = Math.abs(entry - stop);
    const target = side === "long" ? entry + params.targetR * risk : entry - params.targetR * risk;
    let exit = entry;
    let exitTime = bars[i].time;
    let reason = "time";
    let hold = 0;
    for (let j = i + 1; j < bars.length && hold < params.maxHoldBars; j++) {
      hold += 1;
      const bar = bars[j];
      if (side === "long") {
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
    const pnlPts = side === "long" ? exit - entry : entry - exit;
    const pnlR = risk === 0 ? 0 : pnlPts / risk;
    trades.push({
      entryTime: bars[i].time,
      exitTime,
      side,
      entry,
      exit,
      stop,
      pnlPts,
      pnlR,
      reason,
      result: pnlPts >= 0 ? "win" : "loss",
    });
    i += Math.max(2, hold);
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
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const expectancyR = trades.length ? trades.reduce((a, t) => a + t.pnlR, 0) / trades.length : 0;
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : grossWin / grossLoss;
  const netPts = trades.reduce((a, t) => a + t.pnlPts, 0);
  const avgHoldBars = trades.length
    ? trades.reduce((a, t) => a + Math.max(1, Math.round((t.exitTime - t.entryTime) / (5 * 60 * 1000))), 0) /
      trades.length
    : 0;

  void sessionVwap;
  return {
    trades,
    winRate,
    expectancyR,
    profitFactor,
    netPts,
    maxDrawdownR: maxDd,
    avgHoldBars,
  };
}
