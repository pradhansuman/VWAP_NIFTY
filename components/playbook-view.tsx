"use client";

import { useEffect, useMemo, useState, memo } from "react";
import type { Bar, Instrument } from "@/lib/types";
import type { BacktestStats, BacktestTrade } from "@/lib/types";
import type { ChecklistStep, PlaybookSnapshot } from "@/lib/playbook";
import { formatIstTime, inr, rsiLabel, usd } from "@/lib/format";
import { Pill } from "@/components/pills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

type LivePayload = {
  symbol: string;
  source: string;
  instrument: Instrument;
  snapshot: PlaybookSnapshot;
  bars: Bar[];
  vwapSeries: number[];
  rsiSeries: number[];
  symbols: Instrument[];
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

const PlayChart = memo(function PlayChart({
  bars,
  vwapSeries,
  rsiSeries,
  snapshot,
}: {
  bars: Bar[];
  vwapSeries: number[];
  rsiSeries: number[];
  snapshot: PlaybookSnapshot;
}) {
  const w = 920;
  const h = 280;
  const rsiH = 90;
  const pad = 16;
  if (bars.length < 2) return <p className="text-sm text-zinc-500">Not enough 15m candles yet.</p>;
  const min = Math.min(...bars.map((b) => b.low), ...vwapSeries.filter(Number.isFinite));
  const max = Math.max(...bars.map((b) => b.high), ...vwapSeries.filter(Number.isFinite));
  const range = Math.max(1e-6, max - min);
  const x = (i: number) => pad + (i / Math.max(1, bars.length - 1)) * (w - pad * 2);
  const y = (px: number) => pad + ((max - px) / range) * (h - pad * 2);
  const rsiY = (v: number) => 8 + ((100 - v) / 100) * (rsiH - 16);
  const vwapPath = vwapSeries
    .map((v, i) => (Number.isFinite(v) ? `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}` : ""))
    .join(" ");
  const rsiStart = rsiSeries.findIndex(Number.isFinite);
  const rsiPath = rsiSeries
    .map((v, i) => (Number.isFinite(v) ? `${i === rsiStart ? "M" : "L"} ${x(i)} ${rsiY(v)}` : ""))
    .join(" ");
  const vwapColor = snapshot.vwapTrend === "rising" ? "#34d399" : snapshot.vwapTrend === "falling" ? "#fb7185" : "#94a3b8";
  const setup = snapshot.setup;
  const rejIdx = setup ? bars.findIndex((b) => b.time === setup.rejectionTime) : -1;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[640px]">
        {setup && Number.isFinite(setup.entry) && (
          <>
            <line x1={pad} x2={w - pad} y1={y(setup.target)} y2={y(setup.target)} stroke="#34d399" strokeDasharray="6 4" strokeOpacity="0.85" />
            <line x1={pad} x2={w - pad} y1={y(setup.entry)} y2={y(setup.entry)} stroke="#e2e8f0" strokeDasharray="4 3" strokeOpacity="0.8" />
            <line x1={pad} x2={w - pad} y1={y(setup.stop)} y2={y(setup.stop)} stroke="#fb7185" strokeDasharray="6 4" strokeOpacity="0.85" />
          </>
        )}
        {bars.map((bar, i) => {
          const up = bar.close >= bar.open;
          const isRej = i === rejIdx;
          return (
            <g key={bar.time}>
              <line x1={x(i)} x2={x(i)} y1={y(bar.high)} y2={y(bar.low)} stroke={isRej ? "#fbbf24" : up ? "#34d399" : "#fb7185"} strokeWidth={isRej ? 2 : 1} />
              <line
                x1={x(i)}
                x2={x(i)}
                y1={y(bar.open)}
                y2={y(bar.close)}
                stroke={isRej ? "#fbbf24" : up ? "#34d399" : "#fb7185"}
                strokeWidth={isRej ? 5 : 3}
                strokeLinecap="round"
              />
            </g>
          );
        })}
        <path d={vwapPath} fill="none" stroke={vwapColor} strokeWidth="1.8" />
      </svg>
      <svg viewBox={`0 0 ${w} ${rsiH}`} className="mt-2 h-auto w-full min-w-[640px]">
        <line x1={pad} x2={w - pad} y1={rsiY(55)} y2={rsiY(55)} stroke="#34d399" strokeOpacity="0.25" />
        <line x1={pad} x2={w - pad} y1={rsiY(50)} y2={rsiY(50)} stroke="#94a3b8" strokeOpacity="0.45" />
        <line x1={pad} x2={w - pad} y1={rsiY(45)} y2={rsiY(45)} stroke="#fb7185" strokeOpacity="0.25" />
        <path d={rsiPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
      </svg>
      <p className="mt-1 text-[11px] text-zinc-500">
        Teal VWAP = rising · rose VWAP = falling · amber candle = rejection · dashed white entry · green target 1:2 · red stop
      </p>
    </div>
  );
});

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
                snap.setup
                  ? `${venue === "spot" ? (snap.setup.side === "long" ? "Long" : "Short") : snap.setup.option} ${snap.setup.status === "entry" ? "ENTRY" : "wait"}`
                  : "None"
              }
            />
          </div>
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
                {snap.setup?.side === "long" && <Levels setup={snap.setup} />}
              </CardContent>
            </Card>
            <Card className="border-rose-400/25 bg-rose-400/5">
              <CardHeader className="border-b border-rose-400/15">
                <CardTitle className="text-rose-200">{shortName}</CardTitle>
                <CardDescription>VWAP falling · pullback · bearish rejection · RSI &lt; 50 falling · break rejection low</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <StepList steps={snap.short.steps} tone="short" />
                {snap.setup?.side === "short" && <Levels setup={snap.setup} />}
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

function Levels({ setup }: { setup: NonNullable<PlaybookSnapshot["setup"]> }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-black/25 p-3 font-mono text-xs">
      <div>
        <p className="text-zinc-500">Entry</p>
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
