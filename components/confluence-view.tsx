"use client";

import { useLiveJson } from "@/lib/use-live-json";
import type { Instrument, TimeframeSnapshot } from "@/lib/types";
import { inr, rsiLabel } from "@/lib/format";
import { Pill } from "@/components/pills";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Signal = {
  instrument: Instrument;
  pcr: number | null;
  pcrBias: "bullish" | "bearish" | "neutral" | null;
  tf: TimeframeSnapshot;
};

export function ConfluenceView({ initial = null }: { initial?: { signals: Signal[] } | null }) {
  const { data, error } = useLiveJson<{ signals: Signal[] }>("/api/confluence", initial, 20_000);
  const signals = data?.signals ?? null;

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }
  if (!signals) {
    return <p className="px-1 py-10 text-sm text-zinc-400">Checking VWAP reclaim against RSI divergence…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">VWAP-RSI confluence</h2>
        <p className="text-sm text-zinc-400">
          Long when price reclaims VWAP from below and RSI agrees (bullish divergence or rising slope). Short is the mirror. Same logic as a Nifty Option Sniper overlay, without needing Pine on this desk.
        </p>
      </div>
      {signals.length === 0 ? (
        <Card className="border-white/10 bg-white/4">
          <CardHeader>
            <CardTitle>No confluence prints</CardTitle>
            <CardDescription>
              No name currently has a VWAP reclaim/reject aligned with RSI. That is a pass — wait for location and momentum to agree.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {signals.map((s) => (
            <Card key={s.instrument.symbol} className="border-white/10 bg-white/4">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{s.instrument.symbol}</CardTitle>
                    <CardDescription>
                      {s.instrument.name} · {inr(s.tf.last)}
                    </CardDescription>
                  </div>
                  <Pill tone={s.tf.confluence.side === "long" ? "long" : s.tf.confluence.side === "short" ? "short" : "neutral"}>
                    {s.tf.confluence.side === "none" ? s.tf.divergence.type : s.tf.confluence.label}
                  </Pill>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-4 text-sm text-zinc-300">
                <p>{s.tf.confluence.reason}</p>
                <p className="text-xs text-zinc-500">{s.tf.divergence.note}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {s.instrument.kind === "index" && s.pcr != null && (
                    <Pill tone={s.pcrBias === "bullish" ? "long" : s.pcrBias === "bearish" ? "short" : "neutral"}>
                      PCR {s.pcr.toFixed(2)} {s.pcrBias}
                    </Pill>
                  )}
                  <Pill>RSI {rsiLabel(s.tf.rsi.value)}</Pill>
                  <Pill>{s.tf.vwap.position} VWAP</Pill>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
