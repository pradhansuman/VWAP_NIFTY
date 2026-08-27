import { NextResponse } from "next/server";
import { DEFAULT_BACKTEST, runBacktest, type BacktestParams } from "@/lib/backtest";
import { getHistory } from "@/lib/market";
import { UNIVERSE } from "@/lib/universe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "NIFTY";
  const params: BacktestParams = {
    rsiPeriod: Number(searchParams.get("rsiPeriod") ?? DEFAULT_BACKTEST.rsiPeriod),
    rsiLongMax: Number(searchParams.get("rsiLongMax") ?? DEFAULT_BACKTEST.rsiLongMax),
    rsiShortMin: Number(searchParams.get("rsiShortMin") ?? DEFAULT_BACKTEST.rsiShortMin),
    stopAtrMult: Number(searchParams.get("stopAtrMult") ?? DEFAULT_BACKTEST.stopAtrMult),
    targetR: Number(searchParams.get("targetR") ?? DEFAULT_BACKTEST.targetR),
    maxHoldBars: Number(searchParams.get("maxHoldBars") ?? DEFAULT_BACKTEST.maxHoldBars),
  };
  const pack = getHistory(symbol);
  if (!pack) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const stats = runBacktest(pack.bars, params);
  return NextResponse.json({
    symbol,
    universe: UNIVERSE.map((u) => u.symbol),
    params,
    stats: {
      ...stats,
      trades: stats.trades.slice(-40),
      tradeCount: stats.trades.length,
    },
  });
}
