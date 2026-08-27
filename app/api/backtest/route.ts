import { NextResponse } from "next/server";
import { DEFAULT_BACKTEST, runBacktest, type BacktestParams } from "@/lib/backtest";
import { loadDesk, loadHistory } from "@/lib/desk";

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
  const pack = await loadHistory(symbol, request);
  if (!pack) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const desk = await loadDesk(request);
  const stats = runBacktest(pack.bars, params);
  return NextResponse.json({
    symbol,
    source: pack.source,
    universe: desk.symbols.map((u) => u.symbol),
    params,
    stats: {
      ...stats,
      trades: stats.trades.slice(-40),
      tradeCount: stats.trades.length,
    },
  });
}
