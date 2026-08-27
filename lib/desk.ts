import type { Bar, DataSource, Instrument, WatchlistRow } from "@/lib/types";
import { LIVE_UNIVERSE, UNIVERSE, getInstrument } from "@/lib/universe";
import { flattenBars, generateHistory, pcrFor } from "@/lib/simulate";
import { buildRows, chartFromBars, getHistory as simHistory } from "@/lib/market";
import { getCreds } from "@/lib/upstox/auth";
import { fetchFiveMinuteBars } from "@/lib/upstox/candles";
import { fetchNiftyAtm, pcrBias } from "@/lib/upstox/chain";
import { mapPool } from "@/lib/upstox/client";

export type DeskPack = {
  source: DataSource;
  sourceNote: string;
  rows: WatchlistRow[];
  symbols: Instrument[];
};

const deskCache = new Map<string, { at: number; pack: DeskPack }>();

function simulatedDesk(nowMs: number, note: string): DeskPack {
  const rows = UNIVERSE.map((instrument) => {
    const bars = flattenBars(generateHistory(instrument, nowMs));
    const { pcr, bias } = pcrFor(instrument.symbol, nowMs);
    return buildRows([{ instrument, bars }], pcr, bias)[0];
  });
  return {
    source: "simulated",
    sourceNote: note,
    rows,
    symbols: UNIVERSE,
  };
}

async function liveDesk(token: string, nowMs: number): Promise<DeskPack> {
  const atm = await fetchNiftyAtm(token).catch(() => null);
  const liveNames: Instrument[] = [...LIVE_UNIVERSE];
  if (atm) {
    liveNames.push(atm.call, atm.put);
  }
  const series = await mapPool(liveNames, 4, async (instrument) => {
    const bars = await fetchFiveMinuteBars(token, instrument.instrumentKey!, nowMs);
    return { instrument, bars };
  });
  const usable = series.filter((s) => s.bars.length >= 20);
  if (usable.length < 3) {
    throw new Error("Upstox returned too few candles to build the desk.");
  }
  const pcr = atm?.pcr ?? 1;
  const bias = pcrBias(pcr);
  const rows = buildRows(usable, pcr, bias);
  return {
    source: "upstox",
    sourceNote: atm
      ? `Live Upstox candles · Nifty PCR ${pcr.toFixed(2)} · ATM ${atm.call.symbol}/${atm.put.symbol}`
      : "Live Upstox candles (option chain unavailable this expiry).",
    rows,
    symbols: usable.map((s) => s.instrument),
  };
}

export async function loadDesk(request?: Request, nowMs = Date.now()): Promise<DeskPack> {
  const { accessToken } = getCreds(request);
  const cacheKey = accessToken ? `upstox:${accessToken.slice(-8)}` : "sim";
  const cached = deskCache.get(cacheKey);
  if (cached && nowMs - cached.at < 15_000) return cached.pack;

  if (!accessToken) {
    const pack = simulatedDesk(nowMs, "No Upstox access token — using the session simulator.");
    deskCache.set(cacheKey, { at: nowMs, pack });
    return pack;
  }
  try {
    const pack = await liveDesk(accessToken, nowMs);
    deskCache.set(cacheKey, { at: nowMs, pack });
    return pack;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstox request failed";
    const pack = simulatedDesk(nowMs, `Upstox fallback: ${message}`);
    deskCache.set(cacheKey, { at: nowMs, pack });
    return pack;
  }
}

export async function loadHistory(symbol: string, request?: Request, nowMs = Date.now()) {
  const { accessToken } = getCreds(request);
  if (accessToken) {
    const desk = await loadDesk(request, nowMs);
    const instrument = desk.symbols.find((s) => s.symbol === symbol) ?? getInstrument(symbol);
    const key = instrument?.instrumentKey;
    if (instrument && key) {
      const bars = await fetchFiveMinuteBars(accessToken, key, nowMs);
      if (bars.length >= 20) return { instrument, bars, source: "upstox" as const };
    }
  }
  const sim = simHistory(symbol, nowMs);
  if (!sim) return null;
  return { instrument: sim.instrument, bars: sim.bars, source: "simulated" as const };
}

export function toChart(
  pack: { instrument: Instrument; bars: Bar[] },
  anchor: "session" | "week" | "gap",
  nowMs = Date.now(),
) {
  return chartFromBars(pack, anchor, nowMs);
}
