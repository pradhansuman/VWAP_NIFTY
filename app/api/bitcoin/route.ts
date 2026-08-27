import { NextResponse } from "next/server";
import { loadBitcoinDesk } from "@/lib/bitcoin/desk";
import { getScanner } from "@/lib/market";
import { bitcoinPayload } from "@/lib/payloads";
import { formatIstClock } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const desk = await loadBitcoinDesk(now);
  return NextResponse.json({
    ...bitcoinPayload(desk, now),
    istClock: formatIstClock(now),
    hits: getScanner([desk.row], now),
  });
}
