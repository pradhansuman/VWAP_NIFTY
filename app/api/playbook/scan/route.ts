import { NextResponse } from "next/server";
import { loadDesk, loadHistory } from "@/lib/desk";
import { mapPool } from "@/lib/upstox/client";
import { evaluatePlaybook, type PlaybookSnapshot } from "@/lib/playbook";
import type { Instrument } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const desk = await loadDesk(request);
  const scans = (
    await mapPool(desk.symbols, 8, async (instrument) => {
      const history = await loadHistory(instrument.symbol, request);
      if (!history) return null;
      const { snapshot } = evaluatePlaybook(history.bars);
      return { instrument, snapshot };
    })
  ).filter((row): row is { instrument: Instrument; snapshot: PlaybookSnapshot } => row !== null);
  const actionable = scans
    .filter((s) => s.snapshot.setup || s.snapshot.long.ready || s.snapshot.short.ready)
    .sort((a, b) => {
      const rank = (s: (typeof scans)[number]) =>
        s.snapshot.setup?.status === "entry" ? 0 : s.snapshot.setup ? 1 : 2;
      return rank(a) - rank(b);
    });
  return NextResponse.json({
    source: desk.source,
    sourceNote: desk.sourceNote,
    scans: actionable.length ? actionable : scans.slice(0, 8),
    all: scans,
  });
}
