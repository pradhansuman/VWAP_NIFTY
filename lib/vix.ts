import { fetchFiveMinuteBars } from "@/lib/upstox/candles";
import { fetchLtpMap } from "@/lib/upstox/quotes";
import { sessionOpenUtc } from "@/lib/session";
import { createTtlCache } from "@/lib/swr";

export const INDIA_VIX_KEY = "NSE_INDEX|India VIX";

export type VixState = {
  last: number;
  prevClose: number;
  changePct: number;
  regime: "expanding" | "compressing" | "steady";
  elevated: boolean;
  note: string;
};

const vixCache = createTtlCache<VixState>(15_000);

export function vixFromLevels(last: number, prevClose: number): VixState {
  const base = prevClose || last;
  const changePct = base ? ((last - base) / base) * 100 : 0;
  const elevated = last >= 16;
  const regime: VixState["regime"] = changePct >= 2 ? "expanding" : changePct <= -2 ? "compressing" : "steady";
  const note =
    regime === "expanding"
      ? elevated
        ? "India VIX expanding and elevated — size down; skip chops."
        : "India VIX expanding — prefer VWAP trend, skip mean-reversion."
      : regime === "compressing"
        ? "India VIX compressing — breakouts need a clean VWAP slope."
        : elevated
          ? "India VIX elevated but not expanding."
          : "India VIX steady.";
  return { last, prevClose: base, changePct, regime, elevated, note };
}

export function simulatedVix(nowMs: number): VixState {
  const hour = new Date(nowMs).getUTCHours();
  const last = 13.8 + ((hour % 5) * 0.35);
  return vixFromLevels(last, 13.6);
}

export function vixHardVeto(vix: VixState | null, choppy: boolean): string | null {
  if (!vix) return null;
  if (vix.changePct >= 8 && choppy) {
    return `India VIX expanding ${vix.changePct.toFixed(1)}% with VWAP chops — no trade.`;
  }
  return null;
}

export async function loadIndiaVix(token: string, nowMs = Date.now()): Promise<VixState> {
  return vixCache.getOrLoad("india-vix", nowMs, async () => {
    const quotes = await fetchLtpMap(token, [INDIA_VIX_KEY]).catch(() => new Map());
    const q = quotes.get(INDIA_VIX_KEY);
    let last = q?.last ?? 0;
    let prev = q?.prevClose ?? 0;
    if (!last) {
      const bars = await fetchFiveMinuteBars(token, INDIA_VIX_KEY, nowMs, 3).catch(() => []);
      last = bars.at(-1)?.close ?? 0;
      const open = sessionOpenUtc(nowMs);
      const prior = [...bars].reverse().find((b) => b.time < open);
      prev = prior?.close ?? last;
    }
    if (!last) return simulatedVix(nowMs);
    return vixFromLevels(last, prev || last);
  });
}
