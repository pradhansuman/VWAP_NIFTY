import type { ConfluenceSignal, Divergence, RsiState, VwapState } from "@/lib/types";
import type { Bar } from "@/lib/types";
import { detectDivergence, reclaimVwap, rsiState, sessionVwap, vwapSeries } from "@/lib/indicators";

export function confluenceSignal(bars: Bar[], vwap: VwapState, rsi: RsiState, divergence: Divergence): ConfluenceSignal {
  const series = vwapSeries(bars);
  const reclaim = reclaimVwap(bars, series);
  if (reclaim === "long" && (divergence.type === "bullish" || rsi.zone === "oversold" || rsi.trend === "rising")) {
    return {
      side: "long",
      label: "VWAP reclaim + bullish RSI",
      reason:
        divergence.type === "bullish"
          ? "Price reclaimed VWAP from below with bullish RSI divergence."
          : "Price reclaimed VWAP from below while RSI is turning up.",
    };
  }
  if (reclaim === "short" && (divergence.type === "bearish" || rsi.zone === "overbought" || rsi.trend === "falling")) {
    return {
      side: "short",
      label: "VWAP reject + bearish RSI",
      reason:
        divergence.type === "bearish"
          ? "Price lost VWAP from above with bearish RSI divergence."
          : "Price lost VWAP from above while RSI is rolling over.",
    };
  }
  if (vwap.position === "above" && rsi.trend === "rising" && rsi.zone !== "overbought") {
    return {
      side: "long",
      label: "Hold above VWAP",
      reason: "Price is holding above VWAP with a rising RSI slope — continuation, not fade.",
    };
  }
  if (vwap.position === "below" && rsi.trend === "falling" && rsi.zone !== "oversold") {
    return {
      side: "short",
      label: "Hold below VWAP",
      reason: "Price is holding below VWAP with a falling RSI slope — continuation, not bounce.",
    };
  }
  return { side: "none", label: "No confluence", reason: "VWAP location and RSI slope do not agree." };
}

export function snapshotFromBars(bars: Bar[]) {
  const vwap = sessionVwap(bars);
  const rsi = rsiState(bars);
  const divergence = detectDivergence(bars);
  const confluence = confluenceSignal(bars, vwap, rsi, divergence);
  const last = bars.at(-1)?.close ?? 0;
  const first = bars[0]?.open ?? last;
  const changePct = first === 0 ? 0 : ((last - first) / first) * 100;
  const vols = bars.map((b) => b.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / Math.max(1, vols.length);
  const volumeVsAvg = avgVol === 0 ? 1 : (bars.at(-1)?.volume ?? 0) / avgVol;
  return { last, changePct, vwap, rsi, divergence, confluence, volumeVsAvg };
}

export function meanReversionSide(deviationPct: number, rsi: number) {
  if (deviationPct <= -2 && rsi <= 30) return "fade_long" as const;
  if (deviationPct >= 2 && rsi >= 70) return "fade_short" as const;
  return null;
}

export function continuationVsExhaustion(vwapPos: VwapState["position"], rsi: RsiState) {
  if (vwapPos === "above" && rsi.trend === "rising") return "continuation_long";
  if (vwapPos === "below" && rsi.trend === "falling") return "continuation_short";
  if (vwapPos === "above" && rsi.zone === "overbought" && rsi.trend === "falling") return "exhaustion_long";
  if (vwapPos === "below" && rsi.zone === "oversold" && rsi.trend === "rising") return "exhaustion_short";
  return "unconfirmed";
}
