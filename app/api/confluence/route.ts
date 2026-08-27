import { NextResponse } from "next/server";
import { getWatchlist } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = getWatchlist();
  const signals = rows
    .map((row) => ({
      instrument: row.instrument,
      pcr: row.pcr,
      pcrBias: row.pcrBias,
      tf: row.timeframes["5m"],
    }))
    .filter((r) => r.tf.confluence.side !== "none" || r.tf.divergence.type !== "none")
    .sort((a, b) => {
      const rank = (s: string) => (s === "long" || s === "short" ? 0 : 1);
      return rank(a.tf.confluence.side) - rank(b.tf.confluence.side);
    });
  return NextResponse.json({ signals });
}
