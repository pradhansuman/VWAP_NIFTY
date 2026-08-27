export type Timeframe = "5m" | "15m" | "1h" | "1D";

export type InstrumentKind = "index" | "stock" | "option";

export type Instrument = {
  symbol: string;
  name: string;
  kind: InstrumentKind;
  lotSize: number;
  basePrice: number;
  instrumentKey?: string;
};

export type DataSource = "upstox" | "simulated";

export type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type VwapState = {
  vwap: number;
  stdev: number;
  band1Upper: number;
  band1Lower: number;
  band2Upper: number;
  band2Lower: number;
  band3Upper: number;
  band3Lower: number;
  deviationPct: number;
  position: "above" | "below" | "at";
};

export type RsiState = {
  value: number;
  slope: number;
  trend: "rising" | "falling" | "flat";
  zone: "oversold" | "overbought" | "neutral";
};

export type Divergence = {
  type: "bullish" | "bearish" | "none";
  confirmed: boolean;
  note: string;
};

export type ConfluenceSignal = {
  side: "long" | "short" | "none";
  label: string;
  reason: string;
};

export type TimeframeSnapshot = {
  timeframe: Timeframe;
  last: number;
  changePct: number;
  vwap: VwapState;
  rsi: RsiState;
  divergence: Divergence;
  confluence: ConfluenceSignal;
  volumeVsAvg: number;
};

export type WatchlistRow = {
  instrument: Instrument;
  pcr: number;
  pcrBias: "bullish" | "bearish" | "neutral";
  timeframes: Record<Timeframe, TimeframeSnapshot>;
  composite: "long" | "short" | "mixed" | "flat";
};

export type ScannerHit = {
  instrument: Instrument;
  last: number;
  vwap: number;
  deviationPct: number;
  rsi: number;
  side: "fade_long" | "fade_short";
  setup: string;
  band: "2σ" | "3σ" | ">2%";
};

export type BacktestTrade = {
  entryTime: number;
  exitTime: number;
  side: "long" | "short";
  entry: number;
  exit: number;
  stop: number;
  pnlPts: number;
  pnlR: number;
  reason: string;
  result: "win" | "loss";
};

export type BacktestStats = {
  trades: BacktestTrade[];
  winRate: number;
  expectancyR: number;
  profitFactor: number;
  netPts: number;
  maxDrawdownR: number;
  avgHoldBars: number;
};
