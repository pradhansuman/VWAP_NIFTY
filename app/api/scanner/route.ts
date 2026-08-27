import { NextResponse } from "next/server";
import { loadDesk } from "@/lib/desk";
import { getScanner, niftyTape } from "@/lib/market";
import { formatIstClock, sessionStatus } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = Date.now();
  const desk = await loadDesk(request, now);
  return NextResponse.json({
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    source: desk.source,
    sourceNote: desk.sourceNote,
    tape: niftyTape(desk.rows, now),
    hits: getScanner(desk.rows, now),
  });
}
