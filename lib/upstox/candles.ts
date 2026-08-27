import type { Bar } from "@/lib/types";
import { istDateKey } from "@/lib/session";
import { encodeKey, parseCandles, upstoxGet } from "@/lib/upstox/client";
import { createTtlCache } from "@/lib/swr";

type CandlePayload = { candles?: unknown[] };

const historical = createTtlCache<Bar[]>(6 * 60 * 60 * 1000);
const intraday = createTtlCache<Bar[]>(8_000);

function istYmd(ms: number) {
  return istDateKey(ms);
}

function mergeBars(left: Bar[], right: Bar[]): Bar[] {
  if (!right.length) return left;
  if (!left.length) return right;
  const byTime = new Map<number, Bar>();
  for (const bar of left) byTime.set(bar.time, bar);
  for (const bar of right) byTime.set(bar.time, bar);
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

export async function fetchFiveMinuteBars(
  token: string,
  instrumentKey: string,
  nowMs = Date.now(),
  lookbackDays = 5,
): Promise<Bar[]> {
  const to = istYmd(nowMs);
  const from = istYmd(nowMs - lookbackDays * 86400000);
  const encoded = encodeKey(instrumentKey);

  const [hist, intra] = await Promise.all([
    historical.getOrLoad(`${instrumentKey}:${from}:${to}`, nowMs, async () => {
      const payload = await upstoxGet<CandlePayload>(
        `/v3/historical-candle/${encoded}/minutes/5/${to}/${from}`,
        token,
      ).catch(() => ({ candles: [] as unknown[] }));
      return parseCandles(payload.candles ?? []);
    }),
    intraday.getOrLoad(`${instrumentKey}:intra`, nowMs, async () => {
      const payload = await upstoxGet<CandlePayload>(
        `/v3/historical-candle/intraday/${encoded}/minutes/5`,
        token,
      ).catch(() => ({ candles: [] as unknown[] }));
      return parseCandles(payload.candles ?? []);
    }),
  ]);

  return mergeBars(hist, intra);
}
