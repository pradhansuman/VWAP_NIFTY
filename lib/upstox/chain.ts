import type { Instrument } from "@/lib/types";
import { upstoxGet } from "@/lib/upstox/client";

type MarketData = {
  ltp?: number;
  volume?: number;
  oi?: number;
};

type Leg = {
  instrument_key?: string;
  market_data?: MarketData;
};

type ChainRow = {
  strike_price?: number;
  pcr?: number;
  expiry?: string;
  underlying_spot_price?: number;
  call_options?: Leg;
  put_options?: Leg;
};

type Contract = {
  expiry?: string;
  instrument_type?: string;
  instrument_key?: string;
  strike_price?: number;
  lot_size?: number;
  trading_symbol?: string;
};

export type ChainSummary = {
  spot: number;
  pcr: number;
  expiry: string;
  call: Instrument;
  put: Instrument;
};

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nearestExpiry(contracts: Contract[], nowMs = Date.now()) {
  const today = new Date(nowMs + 5.5 * 3600000).toISOString().slice(0, 10);
  const expiries = [...new Set(contracts.map((c) => c.expiry).filter((x): x is string => Boolean(x)))].sort();
  return expiries.find((d) => d >= today) ?? expiries.at(-1) ?? null;
}

export async function fetchNiftyAtm(token: string): Promise<ChainSummary | null> {
  const contracts = await upstoxGet<Contract[]>(
    `/v2/option/contract?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}`,
    token,
  );
  if (!Array.isArray(contracts) || contracts.length === 0) return null;
  const expiry = nearestExpiry(contracts);
  if (!expiry) return null;
  const data = await upstoxGet<ChainRow[]>(
    `/v2/option/chain?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}&expiry_date=${expiry}`,
    token,
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  const spot = num(data[0]?.underlying_spot_price);
  if (!spot) return null;
  const atm = data.reduce((best, row) => {
    const a = Math.abs(num(row.strike_price) - spot);
    const b = Math.abs(num(best.strike_price) - spot);
    return a < b ? row : best;
  });
  let callOi = 0;
  let putOi = 0;
  for (const row of data) {
    callOi += num(row.call_options?.market_data?.oi);
    putOi += num(row.put_options?.market_data?.oi);
  }
  const pcr = callOi > 0 ? putOi / callOi : 1;
  const strike = num(atm.strike_price);
  const lot = num(contracts.find((c) => c.expiry === expiry)?.lot_size) || 75;
  const callKey = atm.call_options?.instrument_key;
  const putKey = atm.put_options?.instrument_key;
  if (!callKey || !putKey) return null;
  return {
    spot,
    pcr,
    expiry,
    call: {
      symbol: `NIFTY${strike}CE`,
      name: `Nifty ${strike} CE · ${expiry}`,
      kind: "option",
      lotSize: lot,
      basePrice: num(atm.call_options?.market_data?.ltp) || 1,
      instrumentKey: callKey,
    },
    put: {
      symbol: `NIFTY${strike}PE`,
      name: `Nifty ${strike} PE · ${expiry}`,
      kind: "option",
      lotSize: lot,
      basePrice: num(atm.put_options?.market_data?.ltp) || 1,
      instrumentKey: putKey,
    },
  };
}

export function pcrBias(pcr: number) {
  if (pcr < 0.9) return "bullish" as const;
  if (pcr > 1.15) return "bearish" as const;
  return "neutral" as const;
}
