import { encodeKey, upstoxGet } from "@/lib/upstox/client";
import { createTtlCache } from "@/lib/swr";

export type LtpQuote = {
  key: string;
  last: number;
  prevClose: number;
};

type LtpRow = {
  last_price?: number;
  instrument_token?: string;
  cp?: number;
};

const quoteCache = createTtlCache<Map<string, LtpQuote>>(2_500);

function parseQuotes(data: unknown): Map<string, LtpQuote> {
  const out = new Map<string, LtpQuote>();
  if (!data || typeof data !== "object") return out;
  for (const row of Object.values(data as Record<string, LtpRow>)) {
    const key = String(row.instrument_token ?? "");
    const last = Number(row.last_price);
    if (!key || !Number.isFinite(last)) continue;
    out.set(key, { key, last, prevClose: Number(row.cp) || 0 });
  }
  return out;
}

export async function fetchLtpMap(token: string, keys: string[]): Promise<Map<string, LtpQuote>> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return new Map();
  const cacheKey = unique.slice().sort().join(",");
  return quoteCache.getOrLoad(cacheKey, Date.now(), async () => {
    const q = unique.map(encodeKey).join(",");
    const data = await upstoxGet<Record<string, LtpRow>>(`/v3/market-quote/ltp?instrument_key=${q}`, token);
    return parseQuotes(data);
  });
}
