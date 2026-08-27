"use client";

import { useEffect, useState } from "react";
import type { DataSource, TimeframeSnapshot } from "@/lib/types";
import { inr, pct } from "@/lib/format";
import { Pill, Tone } from "@/components/pills";

type Tape = {
  nifty: TimeframeSnapshot;
  bank: TimeframeSnapshot;
  pcr: number;
  pcrBias: "bullish" | "bearish" | "neutral";
};

export function TapeBar({
  tape,
  clock,
  session,
  source,
}: {
  tape: Tape;
  clock: string;
  session: string;
  source?: DataSource;
}) {
  const [liveClock, setLiveClock] = useState(clock);
  useEffect(() => {
    const id = setInterval(() => {
      setLiveClock(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          weekday: "short",
          day: "2-digit",
          month: "short",
        }).format(new Date()),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
        <p className="text-[11px] text-zinc-400">Nifty 50 · 5m VWAP</p>
        <p className="font-mono text-lg tabular-nums">{inr(tape.nifty.last, 2)}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <Tone value={tape.nifty.changePct} />
          <span className="text-zinc-500">vs VWAP {pct(tape.nifty.vwap.deviationPct)}</span>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
        <p className="text-[11px] text-zinc-400">Bank Nifty</p>
        <p className="font-mono text-lg tabular-nums">{inr(tape.bank.last, 2)}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <Tone value={tape.bank.changePct} />
          <Pill tone={tape.bank.vwap.position === "above" ? "long" : tape.bank.vwap.position === "below" ? "short" : "neutral"}>
            {tape.bank.vwap.position} VWAP
          </Pill>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
        <p className="text-[11px] text-zinc-400">{source === "upstox" ? "Index PCR (Upstox chain)" : "Index PCR (sim)"}</p>
        <p className="font-mono text-lg tabular-nums">{tape.pcr.toFixed(2)}</p>
        <div className="mt-1">
          <Pill tone={tape.pcrBias === "bullish" ? "long" : tape.pcrBias === "bearish" ? "short" : "neutral"}>
            {tape.pcrBias} directional bias
          </Pill>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
        <p className="text-[11px] text-zinc-400">Asia/Kolkata</p>
        <p className="font-mono text-lg tabular-nums">{liveClock}</p>
        <p className="mt-1 text-xs capitalize text-zinc-500">Session {session}</p>
      </div>
    </div>
  );
}
