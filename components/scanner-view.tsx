"use client";

import { useLiveJson } from "@/lib/use-live-json";
import { useQuotes } from "@/lib/use-quotes";
import type { DataSource, ScannerHit, TimeframeSnapshot } from "@/lib/types";
import { inr, pct, rsiLabel } from "@/lib/format";
import { Pill } from "@/components/pills";
import { TapeBar } from "@/components/tape-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Payload = {
  clock: string;
  session: string;
  source?: DataSource;
  sourceNote?: string;
  tape: { nifty: TimeframeSnapshot; bank: TimeframeSnapshot; pcr: number; pcrBias: "bullish" | "bearish" | "neutral" };
  hits: ScannerHit[];
};

export function ScannerView({ initial = null }: { initial?: Payload | null }) {
  const { data, error } = useLiveJson<Payload>("/api/scanner", initial, 30_000);
  const quotes = useQuotes(["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"], 3000);

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }
  if (!data) {
    return <p className="px-1 py-10 text-sm text-zinc-400">Screening Nifty 50 for VWAP extremes…</p>;
  }

  return (
    <div>
      <TapeBar
        tape={data.tape}
        clock={data.clock}
        session={data.session}
        source={data.source}
        liveNifty={quotes["NSE_INDEX|Nifty 50"]?.last}
        liveBank={quotes["NSE_INDEX|Nifty Bank"]?.last}
      />
      {data.sourceNote && <p className="mb-3 text-xs text-zinc-500">{data.sourceNote}</p>}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Intraday mean-reversion scanner</h2>
        <p className="text-sm text-zinc-400">
          Flags names more than 2% away from session VWAP with RSI in oversold (&lt;30) or overbought (&gt;70). That stretch is only a fade if price actually spent time away from fair value — tagging VWAP all session is how you bleed. Previous-day VWAP close is the magnet/target, not a second entry.
        </p>
      </div>
      {data.hits.length === 0 ? (
        <Card className="border-white/10 bg-white/4">
          <CardHeader>
            <CardTitle>No extremes right now</CardTitle>
            <CardDescription>
              Nothing on the watchlist is both stretched versus VWAP and at an RSI extreme. That is a valid session state — wait rather than force a fade.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.hits.map((hit) => (
            <Card key={hit.instrument.symbol} className="border-white/10 bg-white/4">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{hit.instrument.symbol}</CardTitle>
                    <CardDescription>{hit.instrument.name}</CardDescription>
                  </div>
                  <Pill tone={hit.side === "fade_long" ? "long" : "short"}>
                    {hit.side === "fade_long" ? "Fade long" : "Fade short"}
                  </Pill>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 pt-4 font-mono text-sm">
                <div>
                  <p className="text-[11px] text-zinc-500">Last</p>
                  <p>{inr(hit.last)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">VWAP</p>
                  <p>{inr(hit.vwap)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">RSI</p>
                  <p>{rsiLabel(hit.rsi)}</p>
                </div>
                <div className="col-span-3 text-xs leading-5 text-zinc-300">
                  {pct(hit.deviationPct)} from VWAP · {hit.band} stretch. {hit.setup}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
