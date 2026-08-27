import { NextResponse } from "next/server";
import { loadHistory } from "@/lib/desk";
import { LIVE_UNIVERSE } from "@/lib/universe";
import { backtestPlaybook, evaluatePlaybook } from "@/lib/playbook";
import { loadIndexWindow, type IndexWindowId } from "@/lib/index-window";
import { indexPayload } from "@/lib/payloads";
import { loadIndiaVix } from "@/lib/vix";
import { getCreds } from "@/lib/upstox/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "NIFTY").toUpperCase();
  const mode = searchParams.get("mode") ?? "live";
  const now = Date.now();

  if ((symbol === "NIFTY" || symbol === "BANKNIFTY") && mode !== "backtest") {
    const pack = await loadIndexWindow(symbol as IndexWindowId, request, now);
    const payload = indexPayload(pack, now);
    return NextResponse.json({
      symbol,
      source: payload.source,
      instrument: payload.instrument,
      snapshot: payload.playbook.snapshot,
      bars: payload.playbook.bars,
      vwapSeries: payload.playbook.vwapSeries,
      rsiSeries: payload.playbook.rsiSeries,
      sizing: payload.playbook.sizing,
      symbols: payload.symbols,
    });
  }

  const history = await loadHistory(symbol, request);
  if (!history) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const { accessToken } = getCreds(request);
  const vix = accessToken ? await loadIndiaVix(accessToken, now).catch(() => null) : null;
  const evaluated = evaluatePlaybook(history.bars, { nowMs: now, vix });
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
    sizing: null,
    symbols,
  });
}
