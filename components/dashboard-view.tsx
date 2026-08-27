"use client";

import { useState } from "react";
import { TIMEFRAMES } from "@/lib/universe";
import type { DataSource, Timeframe, WatchlistRow } from "@/lib/types";
import { inr, rsiLabel } from "@/lib/format";
import { Pill } from "@/components/pills";
import { TapeBar } from "@/components/tape-bar";
import { PopOutButton } from "@/components/popout-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useLiveJson } from "@/lib/use-live-json";
import { cn } from "@/lib/utils";

type Payload = {
  clock: string;
  session: string;
  source?: DataSource;
  sourceNote?: string;
  tape: Parameters<typeof TapeBar>[0]["tape"];
  rows: WatchlistRow[];
};

function rsiTone(value: number) {
  if (value >= 70) return "text-rose-300";
  if (value <= 30) return "text-emerald-300";
  return "text-zinc-200";
}

function TfCell({ row, tf }: { row: WatchlistRow; tf: Timeframe }) {
  const snap = row.timeframes[tf];
  return (
    <div className="min-w-[7.5rem]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("font-mono text-xs tabular-nums", snap.vwap.position === "above" ? "text-emerald-300" : snap.vwap.position === "below" ? "text-rose-300" : "text-zinc-300")}>
          {snap.vwap.deviationPct >= 0 ? "+" : ""}
          {snap.vwap.deviationPct.toFixed(2)}%
        </span>
        <span className={cn("font-mono text-xs tabular-nums", rsiTone(snap.rsi.value))}>{rsiLabel(snap.rsi.value)}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        VWAP {snap.vwap.position} · RSI {snap.rsi.trend}
      </p>
    </div>
  );
}

export function DashboardView({ initial = null }: { initial?: Payload | null }) {
  const { data, error } = useLiveJson<Payload>("/api/dashboard", initial, 20_000);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");

  if (error) {
    return <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }
  if (!data) {
    return <p className="px-1 py-10 text-sm text-zinc-400">Building session VWAP and RSI across 5m / 15m / 1h / daily…</p>;
  }

  const rows = data.rows.filter((row) => {
    const hay = `${row.instrument.symbol} ${row.instrument.name}`.toLowerCase();
    const okQ = hay.includes(q.toLowerCase());
    const okK = kind === "all" || row.instrument.kind === kind;
    return okQ && okK;
  });

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-teal-400/25 bg-teal-400/8 px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-teal-300/80 uppercase">Nifty 50 window</p>
          <p className="mt-1 text-sm text-zinc-300">Spot, session VWAP, PCR, ATM CE/PE, and the 15m playbook — isolated from Bank Nifty.</p>
          <div className="mt-3">
            <PopOutButton symbol="NIFTY" label="Open Nifty window" />
          </div>
        </div>
        <div className="rounded-xl border border-sky-400/25 bg-sky-400/8 px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-sky-300/80 uppercase">Bank Nifty window</p>
          <p className="mt-1 text-sm text-zinc-300">Separate live window so you can park Bank Nifty on a second monitor.</p>
          <div className="mt-3">
            <PopOutButton symbol="BANKNIFTY" label="Open Bank Nifty window" />
          </div>
        </div>
      </div>
      <TapeBar tape={data.tape} clock={data.clock} session={data.session} source={data.source} />
      {data.sourceNote && <p className="mb-3 text-xs text-zinc-500">{data.sourceNote}</p>}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Multi-timeframe VWAP-RSI</h2>
          <p className="text-sm text-zinc-400">
            Each cell is VWAP distance then RSI. Green cells sit above VWAP; red sit below. Scan this before an options entry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter Nifty, HDFC, CE…"
            className="w-44 bg-white/5"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-[#0c1a22] px-2 text-sm"
          >
            <option value="all">All</option>
            <option value="index">Index</option>
            <option value="stock">Nifty 50</option>
            <option value="option">Options</option>
          </select>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
          No names match that filter. Clear the search or switch the universe.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-zinc-400">Symbol</TableHead>
                {TIMEFRAMES.map((tf) => (
                  <TableHead key={tf} className="text-zinc-400">
                    {tf} · ΔVWAP / RSI
                  </TableHead>
                ))}
                <TableHead className="text-zinc-400">PCR</TableHead>
                <TableHead className="text-zinc-400">Bias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.instrument.symbol} className="border-white/10">
                  <TableCell>
                    <div className="font-medium">{row.instrument.symbol}</div>
                    <div className="text-[11px] text-zinc-500">
                      {row.instrument.name} · {inr(row.timeframes["5m"].last, 2)}
                    </div>
                  </TableCell>
                  {TIMEFRAMES.map((tf) => (
                    <TableCell key={tf}>
                      <TfCell row={row} tf={tf} />
                    </TableCell>
                  ))}
                  <TableCell className="font-mono tabular-nums">{row.pcr.toFixed(2)}</TableCell>
                  <TableCell>
                    <Pill
                      tone={
                        row.composite === "long" ? "long" : row.composite === "short" ? "short" : row.composite === "mixed" ? "warn" : "neutral"
                      }
                    >
                      {row.composite}
                    </Pill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
