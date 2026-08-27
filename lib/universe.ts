import type { Instrument } from "@/lib/types";

export const UNIVERSE: Instrument[] = [
  { symbol: "NIFTY", name: "Nifty 50", kind: "index", lotSize: 75, basePrice: 24820, instrumentKey: "NSE_INDEX|Nifty 50" },
  { symbol: "BANKNIFTY", name: "Bank Nifty", kind: "index", lotSize: 30, basePrice: 55240, instrumentKey: "NSE_INDEX|Nifty Bank" },
  { symbol: "SENSEX", name: "BSE Sensex", kind: "index", lotSize: 20, basePrice: 81240, instrumentKey: "BSE_INDEX|SENSEX" },
  { symbol: "NIFTY24800CE", name: "Nifty 24800 CE", kind: "option", lotSize: 75, basePrice: 142 },
  { symbol: "NIFTY24800PE", name: "Nifty 24800 PE", kind: "option", lotSize: 75, basePrice: 118 },
  { symbol: "RELIANCE", name: "Reliance Industries", kind: "stock", lotSize: 250, basePrice: 2924, instrumentKey: "NSE_EQ|INE002A01018" },
  { symbol: "HDFCBANK", name: "HDFC Bank", kind: "stock", lotSize: 550, basePrice: 1986, instrumentKey: "NSE_EQ|INE040A01034" },
  { symbol: "ICICIBANK", name: "ICICI Bank", kind: "stock", lotSize: 700, basePrice: 1228, instrumentKey: "NSE_EQ|INE090A01021" },
  { symbol: "INFY", name: "Infosys", kind: "stock", lotSize: 400, basePrice: 1874, instrumentKey: "NSE_EQ|INE009A01021" },
  { symbol: "TCS", name: "Tata Consultancy", kind: "stock", lotSize: 175, basePrice: 4128, instrumentKey: "NSE_EQ|INE467B01029" },
  { symbol: "SBIN", name: "State Bank of India", kind: "stock", lotSize: 750, basePrice: 812, instrumentKey: "NSE_EQ|INE062A01020" },
  { symbol: "ITC", name: "ITC", kind: "stock", lotSize: 1600, basePrice: 492, instrumentKey: "NSE_EQ|INE154A01025" },
  { symbol: "LT", name: "Larsen & Toubro", kind: "stock", lotSize: 150, basePrice: 3648, instrumentKey: "NSE_EQ|INE018A01030" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", kind: "stock", lotSize: 475, basePrice: 1912, instrumentKey: "NSE_EQ|INE397D01024" },
  { symbol: "AXISBANK", name: "Axis Bank", kind: "stock", lotSize: 625, basePrice: 1146, instrumentKey: "NSE_EQ|INE238A01034" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", kind: "stock", lotSize: 400, basePrice: 2088, instrumentKey: "NSE_EQ|INE237A01028" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", kind: "stock", lotSize: 300, basePrice: 2486, instrumentKey: "NSE_EQ|INE030A01027" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", kind: "stock", lotSize: 125, basePrice: 9124, instrumentKey: "NSE_EQ|INE296A01024" },
  { symbol: "MARUTI", name: "Maruti Suzuki", kind: "stock", lotSize: 50, basePrice: 12840, instrumentKey: "NSE_EQ|INE585B01010" },
  { symbol: "TATAMOTORS", name: "Tata Motors", kind: "stock", lotSize: 550, basePrice: 718, instrumentKey: "NSE_EQ|INE155A01022" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", kind: "stock", lotSize: 350, basePrice: 1742, instrumentKey: "NSE_EQ|INE044A01036" },
];

export const LIVE_UNIVERSE = UNIVERSE.filter((s) => Boolean(s.instrumentKey) && s.symbol !== "SENSEX");

export function getInstrument(symbol: string): Instrument | undefined {
  return UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}

export const TIMEFRAMES = ["5m", "15m", "1h", "1D"] as const;
