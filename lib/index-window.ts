import type { DataSource, Instrument, WatchlistRow } from "@/lib/types";
import { getInstrument } from "@/lib/universe";
import { flattenBars, generateHistory, pcrFor } from "@/lib/simulate";
import { buildRows } from "@/lib/market";
import { getCreds } from "@/lib/upstox/auth";
import { fetchFiveMinuteBars } from "@/lib/upstox/candles";
import { fetchIndexAtm, pcrBias } from "@/lib/upstox/chain";
import { mapPool } from "@/lib/upstox/client";
import { rememberInstruments } from "@/lib/desk";
import { createSWR } from "@/lib/swr";

export const INDEX_WINDOWS = {
  NIFTY: {
    symbol: "NIFTY" as const,
    title: "Nifty 50",
    eyebrow: "Nifty window",
    blurb: "Standalone Nifty 50 desk — session VWAP, RSI, PCR, and ATM CE/PE. Isolated from Bank Nifty and stocks.",
    underlyingKey: "NSE_INDEX|Nifty 50",
    prefix: "NIFTY",
    displayName: "Nifty",
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY" as const,
    title: "Bank Nifty",
    eyebrow: "Bank Nifty window",
    blurb: "Standalone Bank Nifty desk — session VWAP, RSI, PCR, and ATM CE/PE. Isolated from Nifty 50 and stocks.",
    underlyingKey: "NSE_INDEX|Nifty Bank",
    prefix: "BANKNIFTY",
    displayName: "Bank Nifty",
  },
};

export type IndexWindowId = keyof typeof INDEX_WINDOWS;

export type IndexWindowPack = {
  source: DataSource;
  sourceNote: string;
  meta: (typeof INDEX_WINDOWS)[IndexWindowId];
  instrument: Instrument;
  rows: WatchlistRow[];
  symbols: Instrument[];
  pcr: number;
  pcrBias: WatchlistRow["pcrBias"];
};

const windowCache = createSWR<IndexWindowPack>(8_000, 90_000);

function simulatedWindow(id: IndexWindowId, nowMs: number, note: string): IndexWindowPack {
  const meta = INDEX_WINDOWS[id];
  const instrument = getInstrument(meta.symbol)!;
  const bars = flattenBars(generateHistory(instrument, nowMs));
  const { pcr, bias } = pcrFor(instrument.symbol, nowMs);
  const rows = buildRows([{ instrument, bars }], pcr, bias);
  return {
    source: "simulated",
    sourceNote: note,
    meta,
    instrument,
    rows,
    symbols: [instrument],
    pcr,
    pcrBias: bias,
  };
}

export async function loadIndexWindow(id: IndexWindowId, request?: Request, nowMs = Date.now()): Promise<IndexWindowPack> {
  const meta = INDEX_WINDOWS[id];
  const instrument = getInstrument(meta.symbol);
  if (!instrument) return simulatedWindow(id, nowMs, "Unknown index.");
  const { accessToken } = getCreds(request);
  if (!accessToken) return simulatedWindow(id, nowMs, "No Upstox token — simulator on this window.");

  return windowCache.getOrLoad(`${id}:${accessToken.slice(-8)}`, nowMs, async () => {
    try {
      const [atm, indexBars] = await Promise.all([
        fetchIndexAtm(accessToken, meta.underlyingKey, meta.prefix, meta.displayName, nowMs).catch(() => null),
        fetchFiveMinuteBars(accessToken, instrument.instrumentKey!, nowMs, 5),
      ]);
      const optionSeries = atm
        ? await mapPool([atm.call, atm.put], 2, async (item) => {
            const bars = await fetchFiveMinuteBars(accessToken, item.instrumentKey!, nowMs, 3);
            return { instrument: item, bars };
          })
        : [];
      const series = [{ instrument, bars: indexBars }, ...optionSeries];
      const usable = series.filter((s) => s.bars.length >= 20);
      if (!usable.length) throw new Error("No candles for this index.");
      const pcr = atm?.pcr ?? 1;
      const bias = pcrBias(pcr);
      const rows = buildRows(usable, pcr, bias);
      rememberInstruments(usable.map((s) => s.instrument));
      return {
        source: "upstox" as const,
        sourceNote: atm
          ? `Live Upstox ${meta.title} · PCR ${pcr.toFixed(2)} · ATM ${atm.call.symbol}/${atm.put.symbol}`
          : `Live Upstox ${meta.title} (option chain unavailable).`,
        meta,
        instrument,
        rows,
        symbols: usable.map((s) => s.instrument),
        pcr,
        pcrBias: bias,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Index window failed";
      return simulatedWindow(id, nowMs, `Upstox fallback: ${message}`);
    }
  });
}
