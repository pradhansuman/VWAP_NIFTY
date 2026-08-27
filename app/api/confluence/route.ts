import { NextResponse } from "next/server";
import { loadDesk } from "@/lib/desk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const desk = await loadDesk(request);
  const signals = desk.rows
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
  return NextResponse.json({ source: desk.source, sourceNote: desk.sourceNote, signals });
}
