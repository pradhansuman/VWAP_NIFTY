"use client";

import { useLiveJson } from "@/lib/use-live-json";
import type { Bar, Timeframe, WatchlistRow } from "@/lib/types";
import type { PlaybookSnapshot } from "@/lib/playbook";
import { TIMEFRAMES } from "@/lib/universe";
import { pct, rsiLabel, usd } from "@/lib/format";
import { Pill, Tone } from "@/components/pills";
import { PlayChart } from "@/components/play-chart";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type Payload = {
  clock: string;
  source: string;
  sourceNote: string;
  row: WatchlistRow;
  tape: {
    last: number;
    changePct: number;
    vwap: { vwap: number; deviationPct: number; position: string };
    rsi: { value: number; trend: string };
    confluence: { side: string; label: string; reason: string };
  };
  playbook: {
    snapshot: PlaybookSnapshot;
    bars: Bar[];
    vwapSeries: number[];
    rsiSeries: number[];
  };
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

function Steps({ steps, tone }: { steps: PlaybookSnapshot["long"]["steps"]; tone: "long" | "short" }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step, idx) => (
        <li key={step.id} className="flex items-start gap-2 text-sm">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
              step.ok
                ? tone === "long"
                  ? "bg-emerald-400/20 text-emerald-300"
                  : "bg-rose-400/20 text-rose-300"
                : "bg-white/8 text-zinc-500",
            )}
          >
            {step.ok ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <span className={step.ok ? "text-zinc-200" : "text-zinc-500"}>
            <span className="mr-1 font-mono text-[11px] text-zinc-500">{idx + 1}.</span>
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function BitcoinView({ initial = null }: { initial?: Payload | null }) {
  const { data, error } = useLiveJson<Payload>("/api/bitcoin", initial, 15_000);
  const snap = data?.playbook.snapshot;
  const setup = snap?.setup;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-amber-300/90 uppercase">Bitcoin window</p>
        <h2 className="text-lg font-semibold">BTCUSDT · UTC VWAP playbook</h2>
        <p className="text-sm text-zinc-400">
          Same 15m rejection-breakout as the indexes: Long / Short in dollars, stop at the rejection extreme, target 1:2.
        </p>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {!data && !error && <p className="text-sm text-zinc-400">Fetching BTCUSDT candles…</p>}

      {data && snap && (
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
              <p className="text-[11px] text-zinc-400">Setup</p>
              <p className="text-sm text-zinc-200">
                {setup
                  ? `${setup.side === "long" ? "Long" : "Short"} ${snap.actionable ? setup.status : "vetoed"}`
                  : "No entry"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{data.tape.confluence.label}</p>
            </div>
          </div>

          {snap.avoid && (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">{snap.avoid}</p>
          )}

          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-white/4 p-3">
              <p className="mb-2 text-sm font-medium">15m UTC VWAP + RSI</p>
              <PlayChart
                bars={data.playbook.bars}
                vwapSeries={data.playbook.vwapSeries}
                rsiSeries={data.playbook.rsiSeries}
                snapshot={snap}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className={cn("rounded-xl border p-3", snap.long.ready ? "border-emerald-400/40 bg-emerald-400/8" : "border-emerald-400/20 bg-emerald-400/5")}>
                <p className="mb-1 text-sm font-medium text-emerald-200">Long BTC</p>
                <Steps steps={snap.long.steps} tone="long" />
              </div>
              <div className={cn("rounded-xl border p-3", snap.short.ready ? "border-rose-400/40 bg-rose-400/8" : "border-rose-400/20 bg-rose-400/5")}>
                <p className="mb-1 text-sm font-medium text-rose-200">Short BTC</p>
                <Steps steps={snap.short.steps} tone="short" />
              </div>
            </div>
          </div>

          {setup ? (
            <div className="rounded-xl border border-white/10 bg-white/4 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={setup.side === "long" ? "long" : "short"}>
                  {setup.side === "long" ? "Long" : "Short"} {snap.actionable ? setup.status : "wait"}
                </Pill>
                <span className="text-xs text-zinc-400">BTCUSDT · 1:2 from the rejection extreme</span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-black/25 p-3">
                  <p className="text-[11px] text-zinc-500">Enter</p>
                  <p className="font-mono text-lg">{usd(setup.entry)}</p>
                </div>
                <div className="rounded-lg bg-black/25 p-3">
                  <p className="text-[11px] text-zinc-500">Stop loss</p>
                  <p className="font-mono text-lg text-rose-300">{usd(setup.stop)}</p>
                </div>
                <div className="rounded-lg bg-black/25 p-3">
                  <p className="text-[11px] text-zinc-500">Target 1:2</p>
                  <p className="font-mono text-lg text-emerald-300">{usd(setup.target)}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Risk {usd(setup.risk)} per coin. Dashed lines on the chart are the same three levels.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-zinc-400">
              No Bitcoin entry yet. Wait for UTC VWAP rejection, RSI confirm, then the 15m breakout. Enter / stop / target print here in USD when that fires.
            </div>
          )}

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
    </div>
  );
}
