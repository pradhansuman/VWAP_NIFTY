import { NextResponse } from "next/server";
import { BTC, btcBacktest, btcPlaybook, loadBitcoinDesk } from "@/lib/bitcoin/desk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") ?? "live";
  const desk = await loadBitcoinDesk();
  const evaluated = btcPlaybook(desk.bars);
  if (mode === "backtest") {
    const stats = btcBacktest(desk.bars);
    return NextResponse.json({
      symbol: BTC.symbol,
      source: desk.source,
      instrument: desk.instrument,
      snapshot: evaluated.snapshot,
      stats: {
        ...stats,
        tradeCount: stats.trades.length,
        trades: stats.trades.slice(-40),
      },
      symbols: [desk.instrument],
    });
  }
  return NextResponse.json({
    symbol: BTC.symbol,
    source: desk.source,
    instrument: desk.instrument,
    snapshot: evaluated.snapshot,
    bars: evaluated.bars.slice(-80),
    vwapSeries: evaluated.vwap.slice(-80),
    rsiSeries: evaluated.rsi.slice(-80),
    symbols: [desk.instrument],
  });
}
