"use client";

import { useEffect, useState } from "react";
import { UNIVERSE } from "@/lib/universe";
import type { BacktestStats, BacktestTrade } from "@/lib/types";
import { DEFAULT_BACKTEST } from "@/lib/backtest";
import { formatIstTime, inr } from "@/lib/format";
import { Pill } from "@/components/pills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Payload = {
  symbol: string;
  params: typeof DEFAULT_BACKTEST;
  stats: BacktestStats & { tradeCount: number };
};

export function BacktestView() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [rsiLongMax, setRsiLongMax] = useState(String(DEFAULT_BACKTEST.rsiLongMax));
  const [rsiShortMin, setRsiShortMin] = useState(String(DEFAULT_BACKTEST.rsiShortMin));
  const [stopAtrMult, setStopAtrMult] = useState(String(DEFAULT_BACKTEST.stopAtrMult));
  const [targetR, setTargetR] = useState(String(DEFAULT_BACKTEST.targetR));
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function run() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      symbol,
      rsiLongMax,
      rsiShortMin,
      stopAtrMult,
      targetR,
    });
    fetch(`/api/backtest?${qs}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(() => setError("Backtest failed."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const qs = new URLSearchParams({
      symbol: "NIFTY",
      rsiLongMax: String(DEFAULT_BACKTEST.rsiLongMax),
      rsiShortMin: String(DEFAULT_BACKTEST.rsiShortMin),
      stopAtrMult: String(DEFAULT_BACKTEST.stopAtrMult),
      targetR: String(DEFAULT_BACKTEST.targetR),
    });
    fetch(`/api/backtest?${qs}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(() => setError("Backtest failed."));
  }, []);

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">VWAP-reclaim backtester</h2>
        <p className="text-sm text-zinc-400">
          Enters on VWAP reclaim/reject when RSI is still on the right side of a threshold, stops at ATR, targets R-multiple. Use this to invalidate a Sniper rule before you lean on it live.
        </p>
      </div>
      <form
        className="grid gap-3 rounded-xl border border-white/10 bg-white/4 p-3 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="text-xs text-zinc-400">
          Symbol
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-white/10 bg-[#0c1a22] px-2 text-sm text-zinc-100"
          >
            {UNIVERSE.map((u) => (
              <option key={u.symbol} value={u.symbol}>
                {u.symbol}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Long if RSI ≤
          <Input value={rsiLongMax} onChange={(e) => setRsiLongMax(e.target.value)} className="mt-1 bg-white/5" />
        </label>
        <label className="text-xs text-zinc-400">
          Short if RSI ≥
          <Input value={rsiShortMin} onChange={(e) => setRsiShortMin(e.target.value)} className="mt-1 bg-white/5" />
        </label>
        <label className="text-xs text-zinc-400">
          Stop (ATR ×)
          <Input value={stopAtrMult} onChange={(e) => setStopAtrMult(e.target.value)} className="mt-1 bg-white/5" />
        </label>
        <label className="text-xs text-zinc-400">
          Target (R)
          <Input value={targetR} onChange={(e) => setTargetR(e.target.value)} className="mt-1 bg-white/5" />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Running…" : "Run backtest"}
          </Button>
        </div>
      </form>
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {stats && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Trades" value={String(stats.tradeCount)} />
            <Stat label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
            <Stat label="Expectancy" value={`${stats.expectancyR.toFixed(2)} R`} />
            <Stat label="Profit factor" value={stats.profitFactor.toFixed(2)} />
            <Stat label="Max DD" value={`${stats.maxDrawdownR.toFixed(2)} R`} />
          </div>
          {stats.trades.length === 0 ? (
            <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
              No fills with these thresholds. Loosen RSI gates or pick a more rotational name.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Side</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Pts</TableHead>
                    <TableHead>R</TableHead>
                    <TableHead>Why</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.trades.map((t: BacktestTrade, i: number) => (
                    <TableRow key={`${t.entryTime}-${i}`} className="border-white/10">
                      <TableCell>
                        <Pill tone={t.side === "long" ? "long" : "short"}>{t.side}</Pill>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatIstTime(t.entryTime)} · {inr(t.entry)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatIstTime(t.exitTime)} · {inr(t.exit)}
                      </TableCell>
                      <TableCell className={t.pnlPts >= 0 ? "text-emerald-300" : "text-rose-300"}>{t.pnlPts.toFixed(2)}</TableCell>
                      <TableCell className={t.pnlR >= 0 ? "text-emerald-300" : "text-rose-300"}>{t.pnlR.toFixed(2)}</TableCell>
                      <TableCell className="capitalize text-zinc-400">{t.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-white/4" size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
