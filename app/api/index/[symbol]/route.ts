import { NextResponse } from "next/server";
import { INDEX_WINDOWS, loadIndexWindow, type IndexWindowId } from "@/lib/index-window";
import { formatIstClock, sessionStatus } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;
  const id = symbol.toUpperCase() as IndexWindowId;
  if (!(id in INDEX_WINDOWS)) {
    return NextResponse.json({ error: "Unknown index window" }, { status: 404 });
  }
  const now = Date.now();
  const pack = await loadIndexWindow(id, request, now);
  const indexRow = pack.rows.find((r) => r.instrument.symbol === pack.instrument.symbol) ?? pack.rows[0];
  const tf = indexRow.timeframes["5m"];
  return NextResponse.json({
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    source: pack.source,
    sourceNote: pack.sourceNote,
    meta: pack.meta,
    instrument: pack.instrument,
    pcr: pack.pcr,
    pcrBias: pack.pcrBias,
    symbols: pack.symbols,
    rows: pack.rows,
    tape: {
      last: tf.last,
      changePct: tf.changePct,
      vwap: tf.vwap,
      rsi: tf.rsi,
      confluence: tf.confluence,
    },
  });
}
