"use client";

import { useEffect, useState } from "react";
import type { Timeframe, WatchlistRow } from "@/lib/types";
import { TIMEFRAMES } from "@/lib/universe";
import { pct, rsiLabel, usd } from "@/lib/format";
import { Pill, Tone } from "@/components/pills";
import { PlaybookView } from "@/components/playbook-view";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Tape = {
  last: number;
  changePct: number;
  vwap: { vwap: number; deviationPct: number; position: string };
  rsi: { value: number; trend: string };
  confluence: { side: string; label: string; reason: string };
};

type Payload = {
  clock: string;
  source: string;
  sourceNote: string;
  row: WatchlistRow;
  tape: Tape;
};

function TfCell({ row, tf }: { row: WatchlistRow; tf: Timeframe }) {
  const snap = row.timeframes[tf];
  return (
    <div className="min-w-[7.5rem]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            snap.vwap.position === "above" ? "text-emerald-300" : snap.vwap.position === "below" ? "text-rose-300" : "text-zinc-300",
          )}
        >
          {snap.vwap.deviationPct >= 0 ? "+" : ""}
          {snap.vwap.deviationPct.toFixed(2)}%
        </span>
        <span className="font-mono text-xs tabular-nums text-zinc-200">{rsiLabel(snap.rsi.value)}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        VWAP {snap.vwap.position} · RSI {snap.rsi.trend}
      </p>
    </div>
  );
}

export function BitcoinView() {
  const [tab, setTab] = useState<"tape" | "playbook">("tape");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bitcoin")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Could not load Bitcoin candles."));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-amber-300/90 uppercase">Separate section</p>
          <h2 className="text-lg font-semibold">Bitcoin desk</h2>
          <p className="text-sm text-zinc-400">
            BTCUSDT with UTC-day VWAP and RSI — same 15m rejection-breakout playbook, isolated from the Nifty/Upstox tape.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "tape" ? "default" : "outline"} onClick={() => setTab("tape")}>
            MTF tape
          </Button>
          <Button size="sm" variant={tab === "playbook" ? "default" : "outline"} onClick={() => setTab("playbook")}>
            15m playbook
          </Button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {!data && !error && <p className="text-sm text-zinc-400">Fetching BTCUSDT candles…</p>}

      {data && tab === "tape" && (
        <>
          <p className="text-xs text-zinc-500">{data.sourceNote} · {data.clock}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2">
              <p className="text-[11px] text-zinc-400">BTCUSDT</p>
              <p className="font-mono text-lg tabular-nums">{usd(data.tape.last)}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <Tone value={data.tape.changePct} />
                <span className="text-zinc-500">vs UTC VWAP {pct(data.tape.vwap.deviationPct)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">UTC-day VWAP</p>
              <p className="font-mono text-lg tabular-nums">{usd(data.tape.vwap.vwap)}</p>
              <Pill tone={data.tape.vwap.position === "above" ? "long" : data.tape.vwap.position === "below" ? "short" : "neutral"}>
                {data.tape.vwap.position} VWAP
              </Pill>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">RSI 14</p>
              <p className="font-mono text-lg tabular-nums">{rsiLabel(data.tape.rsi.value)}</p>
              <p className="text-xs capitalize text-zinc-500">{data.tape.rsi.trend}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">Confluence</p>
              <p className="text-sm text-zinc-200">{data.tape.confluence.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{data.tape.confluence.reason}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  {TIMEFRAMES.map((tf) => (
                    <th key={tf} className="px-3 py-2 font-medium">
                      {tf} · ΔVWAP / RSI
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Bias</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3">
                    <div className="font-medium">BTCUSDT</div>
                    <div className="text-[11px] text-zinc-500">Bitcoin · {usd(data.tape.last)}</div>
                  </td>
                  {TIMEFRAMES.map((tf) => (
                    <td key={tf} className="px-3 py-3">
                      <TfCell row={data.row} tf={tf} />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <Pill
                      tone={
                        data.row.composite === "long"
                          ? "long"
                          : data.row.composite === "short"
                            ? "short"
                            : data.row.composite === "mixed"
                              ? "warn"
                              : "neutral"
                      }
                    >
                      {data.row.composite}
                    </Pill>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "playbook" && (
        <PlaybookView
          endpoint="/api/bitcoin/playbook"
          defaultSymbol="BTCUSDT"
          venue="spot"
          showScan={false}
        />
      )}
    </div>
  );
}
