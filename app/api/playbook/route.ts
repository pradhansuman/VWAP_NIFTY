import { NextResponse } from "next/server";
import { loadHistory } from "@/lib/desk";
import { LIVE_UNIVERSE } from "@/lib/universe";
import { backtestPlaybook, evaluatePlaybook } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "NIFTY";
  const mode = searchParams.get("mode") ?? "live";
  const history = await loadHistory(symbol, request);
  if (!history) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const evaluated = evaluatePlaybook(history.bars);
  const symbols = LIVE_UNIVERSE;

  if (mode === "backtest") {
    const stats = backtestPlaybook(history.bars);
    return NextResponse.json({
      symbol,
      source: history.source,
      instrument: history.instrument,
      snapshot: evaluated.snapshot,
      stats: {
        ...stats,
        tradeCount: stats.trades.length,
        trades: stats.trades.slice(-40),
      },
      symbols,
    });
  }

  return NextResponse.json({
    symbol,
    source: history.source,
    instrument: history.instrument,
    snapshot: evaluated.snapshot,
    bars: evaluated.bars.slice(-80),
    vwapSeries: evaluated.vwap.slice(-80),
    rsiSeries: evaluated.rsi.slice(-80),
    symbols,
  });
}
