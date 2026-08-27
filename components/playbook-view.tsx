"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bar, Instrument } from "@/lib/types";
import type { BacktestStats, BacktestTrade } from "@/lib/types";
import type { ChecklistStep, PlaybookSnapshot, PlaySetup } from "@/lib/playbook";
import type { OptionSizing } from "@/lib/sizing";
import { formatIstTime, inr, rsiLabel, usd } from "@/lib/format";
import { Pill } from "@/components/pills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { PlayChart } from "@/components/play-chart";

type LivePayload = {
  symbol: string;
  source: string;
  instrument: Instrument;
  snapshot: PlaybookSnapshot;
  bars: Bar[];
  vwapSeries: number[];
  rsiSeries: number[];
  symbols: Instrument[];
  sizing?: OptionSizing | null;
};

type ScanRow = { instrument: Instrument; snapshot: PlaybookSnapshot };

function StepList({ steps, tone }: { steps: ChecklistStep[]; tone: "long" | "short" }) {
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

export function PlaybookView({
  endpoint = "/api/playbook",
  scanEndpoint = "/api/playbook/scan",
  defaultSymbol = "NIFTY",
  venue = "options",
  symbolList,
  showScan = true,
}: {
  endpoint?: string;
  scanEndpoint?: string;
  defaultSymbol?: string;
  venue?: "options" | "spot";
  symbolList?: Instrument[];
  showScan?: boolean;
}) {
  const [tab, setTab] = useState<"live" | "scan" | "backtest">("live");
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [live, setLive] = useState<LivePayload | null>(null);
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [stats, setStats] = useState<(BacktestStats & { tradeCount: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`${endpoint}?symbol=${symbol}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setLive(json);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Could not load the 15m playbook.");
        setLoading(false);
      });
    return () => ac.abort();
  }, [symbol, endpoint]);

  useEffect(() => {
    if (tab !== "scan") return;
    fetch(scanEndpoint)
      .then((r) => r.json())
      .then((json) => setScans(json.scans ?? json.all ?? []))
      .catch(() => setScans([]));
  }, [tab, scanEndpoint]);

  function runBacktest() {
    setStats(null);
    fetch(`${endpoint}?symbol=${symbol}&mode=backtest`)
      .then((r) => r.json())
      .then((json) => setStats(json.stats))
      .catch(() => setError("Backtest failed."));
  }

  const snap = live?.snapshot;
  const symbols = symbolList?.length ? symbolList : live?.symbols ?? [];
  const longName = venue === "spot" ? "Long BTC" : "Buy CE";
  const shortName = venue === "spot" ? "Short BTC" : "Buy PE";
  const statusCopy = useMemo(() => {
    if (!snap) return "";
    if (snap.avoid) return snap.avoid;
    if (!snap.actionable && snap.setup)
      return "Setup is on the tape but the session/VIX veto is on — do not fire.";
    if (snap.setup?.status === "entry")
      return snap.setup.side === "long"
        ? `${longName} — rejection high is broken. Stop at rejection low, target 1:2.`
        : `${shortName} — rejection low is broken. Stop at rejection high, target 1:2.`;
    if (snap.setup?.status === "wait_breakout")
      return snap.setup.side === "long"
        ? "Rejection printed. Wait for a 15m close/break above the rejection high."
        : "Rejection printed. Wait for a 15m close/break below the rejection low.";
    return "Trend with VWAP, wait for a pullback rejection, confirm with RSI, enter on the breakout.";
  }, [snap, longName, shortName]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-teal-300/80 uppercase">15-minute playbook</p>
          <h2 className="text-lg font-semibold">VWAP + RSI rejection breakout</h2>
          <p className="text-sm text-zinc-400">
            {venue === "spot"
              ? "UTC-day VWAP on BTCUSDT · RSI 14 · rejection breakout · 1:2. Long on the green path, short on the red path."
              : "Trend with session VWAP · momentum with RSI 14 · entry on the rejection breakout · 1:2 target. Buy CE on the long; buy PE on the short."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["live", "scan", "backtest"] as const)
            .filter((t) => showScan || t !== "scan")
            .map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {t === "live" ? "Live setup" : t === "scan" ? "Watchlist scan" : "Backtest 1:2"}
            </Button>
          ))}
          {(venue === "options" || (symbolList && symbolList.length > 1)) && (
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="h-7 rounded-lg border border-white/10 bg-[#0c1a22] px-2 text-sm"
            >
              {(symbols.length ? symbols : [{ symbol: "NIFTY", name: "Nifty 50" }]).map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.symbol}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {loading && tab === "live" && <p className="text-sm text-zinc-400">Reading 15m session VWAP and RSI…</p>}

      {tab === "live" && snap && live && !loading && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Last (15m)" value={venue === "spot" ? usd(snap.last) : inr(snap.last)} />
            <Stat label={venue === "spot" ? "UTC VWAP" : "Session VWAP"} value={venue === "spot" ? usd(snap.vwap) : inr(snap.vwap)} hint={snap.vwapTrend} />
            <Stat label="RSI 14" value={rsiLabel(snap.rsi)} hint={snap.rsiRising ? "rising" : "falling"} />
            <Stat label="Bias" value={snap.priceSide === "above" ? "Above VWAP" : snap.priceSide === "below" ? "Below VWAP" : "At VWAP"} />
            <Stat
              label="Setup"
              value={
                !snap.actionable && snap.sessionVeto
                  ? "Veto"
                  : snap.setup
                    ? `${venue === "spot" ? (snap.setup.side === "long" ? "Long" : "Short") : snap.setup.option} ${snap.setup.status === "entry" ? "ENTRY" : "wait"}`
                    : "None"
              }
            />
          </div>
          {snap.vix && venue === "options" && (
            <p className="text-xs text-zinc-500">
              India VIX {snap.vix.last.toFixed(2)} · {snap.vix.changePct >= 0 ? "+" : ""}
              {snap.vix.changePct.toFixed(1)}% · {snap.vix.regime}
              {snap.vix.elevated ? " · elevated" : ""} — {snap.vix.note}
            </p>
          )}
          {snap.sessionWindow && venue === "options" && (
            <p className="text-xs text-zinc-500">Session window: {snap.sessionWindow.label}</p>
          )}
          {snap.avoid && (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{snap.avoid}</p>
          )}
          <p className="text-sm text-zinc-300">{statusCopy}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-emerald-400/25 bg-emerald-400/5">
              <CardHeader className="border-b border-emerald-400/15">
                <CardTitle className="text-emerald-200">{longName}</CardTitle>
                <CardDescription>VWAP rising · pullback · bullish rejection · RSI &gt; 50 rising · break rejection high</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <StepList steps={snap.long.steps} tone="long" />
                {snap.setup?.side === "long" && <Levels setup={snap.setup} sizing={live.sizing} />}
              </CardContent>
            </Card>
            <Card className="border-rose-400/25 bg-rose-400/5">
              <CardHeader className="border-b border-rose-400/15">
                <CardTitle className="text-rose-200">{shortName}</CardTitle>
                <CardDescription>VWAP falling · pullback · bearish rejection · RSI &lt; 50 falling · break rejection low</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <StepList steps={snap.short.steps} tone="short" />
                {snap.setup?.side === "short" && <Levels setup={snap.setup} sizing={live.sizing} />}
              </CardContent>
            </Card>
          </div>
          <Card className="border-white/10 bg-white/4">
            <CardHeader>
              <CardTitle>15-minute tape</CardTitle>
              <CardDescription>{live.instrument.name} · {live.source}</CardDescription>
            </CardHeader>
            <CardContent>
              <PlayChart bars={live.bars} vwapSeries={live.vwapSeries} rsiSeries={live.rsiSeries} snapshot={snap} />
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardTitle>RSI 14 guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-zinc-400">
                <p>&gt; 55 strong bullish</p>
                <p>50–55 bullish confirmation</p>
                <p>45–50 weak / uncertain</p>
                <p>&lt; 45 bearish · &lt; 40 strong bearish</p>
                <p className="pt-1 text-zinc-200">{snap.rsiGuideLabel}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-zinc-400">
                <p>Timeframe 15 minutes</p>
                <p>RSI length 14</p>
                <p>Session VWAP (09:15 IST reset)</p>
                <p>Risk : reward 1 : 2</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardTitle>Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-zinc-400">
                <p>Risk 0.5–1% of capital per trade</p>
                <p>Stop is the rejection extreme — do not move it out</p>
                <p>Skip news prints and VWAP chops</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {tab === "scan" && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          {!scans && <p className="px-4 py-8 text-sm text-zinc-400">Scanning 15m rejection setups…</p>}
          {scans && scans.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">No names currently passing the 15m checklist.</p>
          )}
          {scans && scans.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>Symbol</TableHead>
                  <TableHead>VWAP</TableHead>
                  <TableHead>RSI</TableHead>
                  <TableHead>Setup</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((row) => (
                  <TableRow key={row.instrument.symbol} className="border-white/10">
                    <TableCell>
                      <div className="font-medium">{row.instrument.symbol}</div>
                      <div className="text-[11px] text-zinc-500">{inr(row.snapshot.last)}</div>
                    </TableCell>
                    <TableCell className="text-xs capitalize text-zinc-300">
                      {row.snapshot.vwapTrend} · {row.snapshot.priceSide}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{rsiLabel(row.snapshot.rsi)}</TableCell>
                    <TableCell>
                      {row.snapshot.setup ? (
                        <Pill tone={row.snapshot.setup.side === "long" ? "long" : "short"}>
                          {row.snapshot.setup.option} {row.snapshot.setup.status === "entry" ? "entry" : "wait break"}
                        </Pill>
                      ) : row.snapshot.avoid ? (
                        <Pill tone="warn">No trade</Pill>
                      ) : (
                        <Pill>Building</Pill>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSymbol(row.instrument.symbol); setTab("live"); }}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {tab === "backtest" && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Same rules on 15m session VWAP: rejection then breakout, stop at the rejection extreme, target 1:2, exit at session close if neither hits.
          </p>
          <Button onClick={runBacktest}>Run 15m playbook backtest</Button>
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
                  No 15m rejection-breakouts in this sample. Try another name or wait for more sessions.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Side</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead>R</TableHead>
                        <TableHead>Why</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.trades.map((t: BacktestTrade, i: number) => (
                        <TableRow key={`${t.entryTime}-${i}`} className="border-white/10">
                          <TableCell>
                            <Pill tone={t.side === "long" ? "long" : "short"}>
                              {t.side === "long" ? (venue === "spot" ? "Long" : "CE") : venue === "spot" ? "Short" : "PE"}
                            </Pill>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatIstTime(t.entryTime)} · {inr(t.entry)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatIstTime(t.exitTime)} · {inr(t.exit)}
                          </TableCell>
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
      )}
    </div>
  );
}

function Levels({ setup, sizing }: { setup: PlaySetup; sizing?: OptionSizing | null }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-black/25 p-3 font-mono text-xs">
        <div>
          <p className="text-zinc-500">Index entry</p>
          <p>{inr(setup.entry)}</p>
        </div>
        <div>
          <p className="text-zinc-500">SL</p>
          <p className="text-rose-300">{inr(setup.stop)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Target 1:2</p>
          <p className="text-emerald-300">{inr(setup.target)}</p>
        </div>
      </div>
      {sizing && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
          <p className="mb-2 text-zinc-400">
            {sizing.symbol} · lot {sizing.lot} · LTP {inr(sizing.ltp)} · 1-lot debit ₹{inr(sizing.debit, 0)} · ATM Δ {sizing.delta}
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono sm:grid-cols-4">
            <div>
              <p className="text-zinc-500">Premium SL</p>
              <p className="text-rose-300">{inr(sizing.premiumStop)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Premium tgt</p>
              <p className="text-emerald-300">{inr(sizing.premiumTarget)}</p>
            </div>
            <div>
              <p className="text-zinc-500">₹ risk / lot</p>
              <p className="text-rose-300">{inr(sizing.rupeeRisk, 0)}</p>
            </div>
            <div>
              <p className="text-zinc-500">₹ target / lot</p>
              <p className="text-emerald-300">{inr(sizing.rupeeTarget, 0)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-white/10 bg-white/4" size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-base">
          {value} {hint && <span className="text-xs font-normal capitalize text-zinc-500">{hint}</span>}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
