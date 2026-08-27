import { NextResponse } from "next/server";
import { getScanner, getWatchlist, niftyTape } from "@/lib/market";
import { formatIstClock, sessionStatus } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const rows = getWatchlist(now);
  return NextResponse.json({
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    tape: niftyTape(rows, now),
    hits: getScanner(rows, now),
  });
}
