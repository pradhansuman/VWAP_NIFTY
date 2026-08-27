import { NextResponse } from "next/server";
import { loadHistory, toChart } from "@/lib/desk";
import { LIVE_UNIVERSE } from "@/lib/universe";
import { anchoredVwap, detectDivergence, rsiState, vwapSeries, wilderRsi } from "@/lib/indicators";
import { continuationVsExhaustion as confirm } from "@/lib/signals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "NIFTY";
  const anchor = (searchParams.get("anchor") ?? "session") as "session" | "week" | "gap";
  const history = await loadHistory(symbol, request);
  if (!history) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  const pack = toChart(history, anchor);
  const vwap = anchoredVwap(pack.bars, pack.fromIndex);
  const rsi = rsiState(pack.bars);
  const divergence = detectDivergence(pack.bars);
  const series = vwapSeries(pack.bars, pack.fromIndex);
  const rsiSeries = wilderRsi(pack.bars.map((b) => b.close));
  const stance = confirm(vwap.position, rsi);
  return NextResponse.json({
    ...pack,
    source: history.source,
    vwap,
    rsi,
    divergence,
    vwapSeries: series,
    rsiSeries,
    stance,
    symbols: LIVE_UNIVERSE,
  });
}
