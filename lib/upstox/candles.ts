import type { Bar } from "@/lib/types";
import { istDateKey } from "@/lib/session";
import { encodeKey, parseCandles, upstoxGet } from "@/lib/upstox/client";

type CandlePayload = { candles?: unknown[] };

const candleCache = new Map<string, { at: number; bars: Bar[] }>();
const TTL_MS = 20_000;

function istYmd(ms: number) {
  return istDateKey(ms);
}

export async function fetchFiveMinuteBars(token: string, instrumentKey: string, nowMs = Date.now()): Promise<Bar[]> {
  const cacheKey = `${instrumentKey}:5m`;
  const hit = candleCache.get(cacheKey);
  if (hit && nowMs - hit.at < TTL_MS) return hit.bars;

  const to = istYmd(nowMs);
  const fromMs = nowMs - 12 * 86400000;
  const from = istYmd(fromMs);
  const encoded = encodeKey(instrumentKey);

  const [historical, intraday] = await Promise.all([
    upstoxGet<CandlePayload>(`/v3/historical-candle/${encoded}/minutes/5/${to}/${from}`, token).catch(() => ({ candles: [] })),
    upstoxGet<CandlePayload>(`/v3/historical-candle/intraday/${encoded}/minutes/5`, token).catch(() => ({ candles: [] })),
  ]);

  const bars = parseCandles([...(historical.candles ?? []), ...(intraday.candles ?? [])]);
  candleCache.set(cacheKey, { at: nowMs, bars });
  return bars;
}
