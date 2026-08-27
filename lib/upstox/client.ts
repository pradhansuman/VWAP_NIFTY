import type { Bar } from "@/lib/types";

export class UpstoxError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function upstoxGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.upstox.com${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    data?: T;
    errors?: { message?: string }[];
    message?: string;
  };
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || json.message || `Upstox ${path} failed (${res.status})`;
    throw new UpstoxError(msg, res.status);
  }
  return (json.data ?? json) as T;
}

export function encodeKey(instrumentKey: string) {
  return encodeURIComponent(instrumentKey);
}

export function parseCandles(raw: unknown): Bar[] {
  if (!Array.isArray(raw)) return [];
  const bars: Bar[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const time = Date.parse(String(row[0]));
    if (!Number.isFinite(time)) continue;
    bars.push({
      time,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]) || 0,
    });
  }
  bars.sort((a, b) => a.time - b.time);
  const deduped: Bar[] = [];
  for (const bar of bars) {
    const prev = deduped.at(-1);
    if (prev && prev.time === bar.time) deduped[deduped.length - 1] = bar;
    else deduped.push(bar);
  }
  return deduped;
}

export async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.max(1, Math.min(size, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
