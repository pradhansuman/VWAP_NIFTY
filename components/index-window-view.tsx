"use client";

import type { Instrument, Timeframe, WatchlistRow } from "@/lib/types";
import type { PlaybookSnapshot } from "@/lib/playbook";
import type { OptionSizing } from "@/lib/sizing";
import type { VixState } from "@/lib/vix";
import { TIMEFRAMES } from "@/lib/universe";
import { inr, pct, rsiLabel } from "@/lib/format";
import { Pill, Tone } from "@/components/pills";
import { PopOutButton } from "@/components/popout-button";
import { PlayChart } from "@/components/play-chart";
import { cn } from "@/lib/utils";
import { useLiveJson } from "@/lib/use-live-json";
import { useQuotes } from "@/lib/use-quotes";
import type { VwapMap } from "@/lib/vwap-context";
import { VwapMapPanel } from "@/components/vwap-map-panel";
import { Check, X } from "lucide-react";

type Payload = {
  clock: string;
  session: string;
  source: string;
  sourceNote: string;
  meta: { title: string; eyebrow: string; blurb: string; symbol: string };
  instrument: Instrument;
  pcr: number;
  pcrBias: "bullish" | "bearish" | "neutral";
  symbols: Instrument[];
  rows: WatchlistRow[];
  quoteKeys?: string[];
  vix: VixState;
  atm: {
    call: (Instrument & { ltp: number }) | null;
    put: (Instrument & { ltp: number }) | null;
  };
  playbook: {
    snapshot: PlaybookSnapshot;
    bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
    vwapSeries: number[];
    rsiSeries: number[];
    sizing: OptionSizing | null;
    pdVwap?: number | null;
    pwVwap?: number | null;
    tsizeSeries?: number[];
  };
  vwapMap?: VwapMap;
  tape: {
    last: number;
    changePct: number;
    vwap: { vwap: number; deviationPct: number; position: string };
    rsi: { value: number; trend: string };
    confluence: { side: string; label: string; reason: string };
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

export function IndexWindowView({
  symbol,
  compact = false,
  initial = null,
}: {
  symbol: "NIFTY" | "BANKNIFTY" | "SENSEX";
  compact?: boolean;
  initial?: Payload | null;
}) {
  const { data, error } = useLiveJson<Payload>(`/api/index/${symbol}`, initial, 30_000);
  const quotes = useQuotes(data?.quoteKeys ?? [], 3000);
  const accent =
    symbol === "BANKNIFTY"
      ? "border-sky-400/25 bg-sky-400/8"
      : symbol === "SENSEX"
        ? "border-violet-400/25 bg-violet-400/8"
        : "border-teal-400/25 bg-teal-400/8";

  const liveLast = (data?.instrument.instrumentKey && quotes[data.instrument.instrumentKey]?.last) || data?.tape.last;
  const vixLast = quotes["NSE_INDEX|India VIX"]?.last ?? data?.vix.last;
  const callKey = data?.atm.call?.instrumentKey;
  const putKey = data?.atm.put?.instrumentKey;
  const callLtp = (callKey && quotes[callKey]?.last) || data?.atm.call?.ltp;
  const putLtp = (putKey && quotes[putKey]?.last) || data?.atm.put?.ltp;
  const snap = data?.playbook.snapshot;
  const sizing = data?.playbook.sizing;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-teal-300/80 uppercase">
            {data?.meta.eyebrow ?? "Index window"}
          </p>
          <h2 className="text-lg font-semibold">{data?.meta.title ?? symbol}</h2>
          {!compact && <p className="text-sm text-zinc-400">{data?.meta.blurb}</p>}
        </div>
        {!compact && <PopOutButton symbol={symbol} />}
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {!data && !error && <p className="text-sm text-zinc-400">Loading {symbol} session VWAP…</p>}

      {data && snap && (
        <>
          <p className="text-xs text-zinc-500">
            {data.sourceNote} · {data.clock} · {snap.sessionWindow?.label ?? data.session}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className={cn("rounded-xl border px-3 py-2", accent)}>
              <p className="text-[11px] text-zinc-400">{data.instrument.symbol} LTP</p>
              <p className="font-mono text-lg tabular-nums">{inr(liveLast ?? data.tape.last)}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <Tone value={data.tape.changePct} />
                <span className="text-zinc-500">vs VWAP {pct(data.tape.vwap.deviationPct)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">Session VWAP</p>
              <p className="font-mono text-lg tabular-nums">{inr(data.tape.vwap.vwap)}</p>
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
              <p className="text-[11px] text-zinc-400">Index PCR</p>
              <p className="font-mono text-lg tabular-nums">{data.pcr.toFixed(2)}</p>
              <Pill tone={data.pcrBias === "bullish" ? "long" : data.pcrBias === "bearish" ? "short" : "neutral"}>
                {data.pcrBias}
              </Pill>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">India VIX</p>
              <p className="font-mono text-lg tabular-nums">{(vixLast ?? data.vix.last).toFixed(2)}</p>
              <p className="text-xs capitalize text-zinc-500">
                {data.vix.regime}
                {data.vix.changePct >= 0 ? " +" : " "}
                {data.vix.changePct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
              <p className="text-[11px] text-zinc-400">ATM</p>
              <p className="font-mono text-sm tabular-nums">
                CE {callLtp != null ? inr(callLtp) : "—"} · PE {putLtp != null ? inr(putLtp) : "—"}
              </p>
              <p className="text-[11px] text-zinc-500">
                {data.atm.call?.symbol ?? "no chain"} / {data.atm.put?.symbol ?? "—"}
              </p>
            </div>
          </div>

          {data.vwapMap && <VwapMapPanel map={data.vwapMap} compact />}

          {snap.avoid && (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">{snap.avoid}</p>
          )}
          {!snap.avoid && snap.vix && (
            <p className="text-xs text-zinc-500">{snap.vix.note}</p>
          )}

          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-white/4 p-3">
              <p className="mb-2 text-sm font-medium">15m VWAP + RSI</p>
              <PlayChart
                bars={data.playbook.bars}
                vwapSeries={data.playbook.vwapSeries}
                rsiSeries={data.playbook.rsiSeries}
                snapshot={snap}
                pdVwap={data.playbook.pdVwap}
                pwVwap={data.playbook.pwVwap}
                tsizeSeries={data.playbook.tsizeSeries}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className={cn("rounded-xl border p-3", snap.long.ready ? "border-emerald-400/40 bg-emerald-400/8" : "border-emerald-400/20 bg-emerald-400/5")}>
                <p className="mb-1 text-sm font-medium text-emerald-200">Buy CE</p>
                <Steps steps={snap.long.steps} tone="long" />
              </div>
              <div className={cn("rounded-xl border p-3", snap.short.ready ? "border-rose-400/40 bg-rose-400/8" : "border-rose-400/20 bg-rose-400/5")}>
                <p className="mb-1 text-sm font-medium text-rose-200">Buy PE</p>
                <Steps steps={snap.short.steps} tone="short" />
              </div>
            </div>
          </div>

          {snap.setup ? (
            <div className="rounded-xl border border-white/10 bg-white/4 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={snap.setup.side === "long" ? "long" : "short"}>
                  {snap.setup.option} {snap.actionable ? snap.setup.status : "vetoed"}
                </Pill>
                <span className="text-xs text-zinc-400">
                  Index {inr(snap.setup.entry)} → SL {inr(snap.setup.stop)} → tgt {inr(snap.setup.target)} ({inr(snap.setup.risk)} pts risk)
                </span>
              </div>
              {sizing && (
                <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-zinc-500">{sizing.symbol} LTP</p>
                    <p className="font-mono">{inr(snap.setup.option === "CE" ? callLtp ?? sizing.ltp : putLtp ?? sizing.ltp)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Lot · debit</p>
                    <p className="font-mono">
                      {sizing.lot} · ₹{inr(sizing.debit, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Premium SL / tgt</p>
                    <p className="font-mono">
                      {inr(sizing.premiumStop)} / {inr(sizing.premiumTarget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">₹ risk / lot</p>
                    <p className="font-mono text-rose-300">{inr(sizing.rupeeRisk, 0)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">₹ target / lot</p>
                    <p className="font-mono text-emerald-300">{inr(sizing.rupeeTarget, 0)}</p>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-zinc-500">ATM sized at 0.5 delta. Premium risk ≈ index points × 0.5; rupees = that × lot. Not a fill.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-zinc-400">
              No entry yet. Wait for a 15m VWAP rejection, RSI confirm, then the breakout. Entry / SL / 1:2 target print here when that fires.
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
                {data.rows.map((row) => (
                  <tr key={row.instrument.symbol} className="border-t border-white/10">
                    <td className="px-3 py-3">
                      <div className="font-medium">{row.instrument.symbol}</div>
                      <div className="text-[11px] text-zinc-500">
                        {row.instrument.name} · {inr(row.timeframes["5m"].last)}
                      </div>
                    </td>
                    {TIMEFRAMES.map((tf) => (
                      <td key={tf} className="px-3 py-3">
                        <TfCell row={row} tf={tf} />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <Pill
                        tone={
                          row.composite === "long"
                            ? "long"
                            : row.composite === "short"
                              ? "short"
                              : row.composite === "mixed"
                                ? "warn"
                                : "neutral"
                        }
                      >
                        {row.composite}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
