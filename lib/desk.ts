import type { Bar, DataSource, Instrument, WatchlistRow } from "@/lib/types";
import { LIVE_UNIVERSE, UNIVERSE, getInstrument } from "@/lib/universe";
import { flattenBars, generateHistory, pcrFor } from "@/lib/simulate";
import { buildRows, chartFromBars, getHistory as simHistory } from "@/lib/market";
import { getCreds } from "@/lib/upstox/auth";
import { fetchFiveMinuteBars } from "@/lib/upstox/candles";
import { fetchNiftyAtm, pcrBias } from "@/lib/upstox/chain";
import { mapPool } from "@/lib/upstox/client";
import { createSWR } from "@/lib/swr";

export type DeskPack = {
  source: DataSource;
  sourceNote: string;
  rows: WatchlistRow[];
  symbols: Instrument[];
};

const extraInstruments = new Map<string, Instrument>();

export function rememberInstruments(list: Instrument[]) {
  for (const item of list) extraInstruments.set(item.symbol, item);
}

export function resolveInstrument(symbol: string) {
  return extraInstruments.get(symbol) ?? getInstrument(symbol);
}

const deskCache = createSWR<DeskPack>(8_000, 90_000);

function simulatedDesk(nowMs: number, note: string): DeskPack {
  const rows = UNIVERSE.map((instrument) => {
    const bars = flattenBars(generateHistory(instrument, nowMs));
    const { pcr, bias } = instrument.kind === "index" ? pcrFor(instrument.symbol, nowMs) : { pcr: null, bias: null };
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
  const series = await mapPool(liveNames, 8, async (instrument) => {
    const bars = await fetchFiveMinuteBars(
      token,
      instrument.instrumentKey!,
      nowMs,
      instrument.kind === "option" ? 3 : 5,
    );
    return { instrument, bars };
  });
  const usable = series.filter((s) => s.bars.length >= 20);
  if (usable.length < 3) {
    throw new Error("Upstox returned too few candles to build the desk.");
  }
  const pcr = atm?.pcr ?? 1;
  const bias = pcrBias(pcr);
  const rows = buildRows(usable, pcr, bias, (instrument) => instrument.symbol === "NIFTY");
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
  return deskCache.getOrLoad(cacheKey, nowMs, async () => {
    if (!accessToken) {
      return simulatedDesk(nowMs, "No Upstox access token — using the session simulator.");
    }
    try {
      const pack = await liveDesk(accessToken, nowMs);
      rememberInstruments(pack.symbols);
      return pack;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstox request failed";
      return simulatedDesk(nowMs, `Upstox fallback: ${message}`);
    }
  });
}

export async function loadHistory(symbol: string, request?: Request, nowMs = Date.now()) {
  const { accessToken } = getCreds(request);
  if (accessToken) {
    const desk = await loadDesk(request, nowMs);
    const instrument = desk.symbols.find((s) => s.symbol === symbol) ?? resolveInstrument(symbol);
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
