import type { Bar } from "@/lib/types";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const cache = new Map<string, { at: number; bars: Bar[]; source: string }>();
const TTL_MS = 20_000;

function parseBinance(rows: unknown[]): Bar[] {
  const bars: Bar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    bars.push({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]) || 0,
    });
  }
  return bars.sort((a, b) => a.time - b.time);
}

function parseKraken(rows: unknown[]): Bar[] {
  const bars: Bar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    bars.push({
      time: Number(row[0]) * 1000,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[6] ?? row[5]) || 0,
    });
  }
  return bars.sort((a, b) => a.time - b.time);
}

async function getJson(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function fromBinance(host: string): Promise<Bar[]> {
  const url = `${host}/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=1000`;
  const json = await getJson(url);
  if (!Array.isArray(json)) throw new Error("binance: unexpected payload");
  const bars = parseBinance(json);
  if (bars.length < 50) throw new Error("binance: too few candles");
  return bars;
}

async function fromKraken(): Promise<Bar[]> {
  const json = (await getJson("https://api.kraken.com/0/public/OHLC?pair=XBTUSDT&interval=5")) as {
    error?: string[];
    result?: Record<string, unknown>;
  };
  if (json.error?.length) throw new Error(json.error.join(", "));
  const result = json.result ?? {};
  const key = Object.keys(result).find((k) => k !== "last");
  const rows = key ? result[key] : null;
  if (!Array.isArray(rows)) throw new Error("kraken: no ohlc");
  const bars = parseKraken(rows);
  if (bars.length < 50) throw new Error("kraken: too few candles");
  return bars;
}

export async function fetchBtcFiveMinute(nowMs = Date.now()): Promise<{ bars: Bar[]; source: string }> {
  const hit = cache.get("BTCUSDT:5m");
  if (hit && nowMs - hit.at < TTL_MS) return { bars: hit.bars, source: hit.source };

  const attempts: { source: string; run: () => Promise<Bar[]> }[] = [
    { source: "binance", run: () => fromBinance("https://api.binance.com") },
    { source: "binance", run: () => fromBinance("https://data-api.binance.vision") },
    { source: "kraken", run: () => fromKraken() },
  ];

  let lastError = "Bitcoin feed failed";
  for (const attempt of attempts) {
    try {
      const bars = await attempt.run();
      cache.set("BTCUSDT:5m", { at: nowMs, bars, source: attempt.source });
      return { bars, source: attempt.source };
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }
  throw new Error(lastError);
}
