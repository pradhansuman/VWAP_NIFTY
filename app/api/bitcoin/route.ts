import { NextResponse } from "next/server";
import { loadBitcoinDesk } from "@/lib/bitcoin/desk";
import { getScanner } from "@/lib/market";
import { formatIstClock } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const desk = await loadBitcoinDesk(now);
  const tf = desk.row.timeframes["5m"];
  return NextResponse.json({
    generatedAt: now,
    clock: new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(now) + " UTC",
    istClock: formatIstClock(now),
    source: desk.source,
    sourceNote: desk.sourceNote,
    instrument: desk.instrument,
    row: desk.row,
    tape: {
      last: tf.last,
      changePct: tf.changePct,
      vwap: tf.vwap,
      rsi: tf.rsi,
      confluence: tf.confluence,
    },
    hits: getScanner([desk.row], now),
  });
}
