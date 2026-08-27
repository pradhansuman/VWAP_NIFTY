"use client";

import { useEffect, useMemo, useState } from "react";
import { UNIVERSE } from "@/lib/universe";
import type { Bar, Divergence, Instrument, RsiState, VwapState } from "@/lib/types";
import { inr, rsiLabel } from "@/lib/format";
import { Pill } from "@/components/pills";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Payload = {
  instrument: Instrument;
  bars: Bar[];
  fromIndex: number;
  vwap: VwapState;
  rsi: RsiState;
  divergence: Divergence;
  vwapSeries: number[];
  rsiSeries: number[];
  stance?: string;
  source?: string;
  symbols?: { symbol: string; name: string }[];
};

function Chart({ bars, vwapSeries, rsiSeries }: { bars: Bar[]; vwapSeries: number[]; rsiSeries: number[] }) {
  const w = 920;
  const h = 280;
  const rsiH = 90;
  const pad = 16;
  const min = Math.min(...bars.map((b) => b.low));
  const max = Math.max(...bars.map((b) => b.high));
  const range = Math.max(1e-6, max - min);
  const x = (i: number) => pad + (i / Math.max(1, bars.length - 1)) * (w - pad * 2);
  const y = (px: number) => pad + ((max - px) / range) * (h - pad * 2);
  const rsiY = (v: number) => 8 + ((100 - v) / 100) * (rsiH - 16);
  const vwapPath = vwapSeries
    .map((v, i) => (Number.isFinite(v) ? `${i === vwapSeries.findIndex(Number.isFinite) ? "M" : "L"} ${x(i)} ${y(v)}` : ""))
    .join(" ");
  const rsiPath = rsiSeries
    .map((v, i) => (Number.isFinite(v) ? `${i === rsiSeries.findIndex(Number.isFinite) ? "M" : "L"} ${x(i)} ${rsiY(v)}` : ""))
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[640px]">
        {bars.map((bar, i) => {
          const up = bar.close >= bar.open;
          return (
            <g key={bar.time}>
              <line x1={x(i)} x2={x(i)} y1={y(bar.high)} y2={y(bar.low)} stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1" />
              <line
                x1={x(i)}
                x2={x(i)}
                y1={y(bar.open)}
                y2={y(bar.close)}
                stroke={up ? "#34d399" : "#fb7185"}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        <path d={vwapPath} fill="none" stroke="#5eead4" strokeWidth="1.6" />
      </svg>
      <svg viewBox={`0 0 ${w} ${rsiH}`} className="mt-2 h-auto w-full min-w-[640px]">
        <line x1={pad} x2={w - pad} y1={rsiY(70)} y2={rsiY(70)} stroke="#fb7185" strokeOpacity="0.35" />
        <line x1={pad} x2={w - pad} y1={rsiY(30)} y2={rsiY(30)} stroke="#34d399" strokeOpacity="0.35" />
        <path d={rsiPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function AnchorView() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [anchor, setAnchor] = useState<"session" | "week" | "gap">("session");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/chart?symbol=${symbol}&anchor=${anchor}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Chart failed to load.");
        setLoading(false);
      });
    return () => ac.abort();
  }, [symbol, anchor]);

  const stanceCopy = useMemo(() => {
    switch (data?.stance) {
      case "continuation_long":
        return "Anchored VWAP is support and RSI slope is rising — treat dips as continuation, not exhaustion.";
      case "continuation_short":
        return "Anchored VWAP is resistance and RSI slope is falling — bounces are likely sells.";
      case "exhaustion_long":
        return "Price is extended above VWAP while RSI rolls over — exhaustion risk versus PCR longs.";
      case "exhaustion_short":
        return "Price is extended below VWAP while RSI turns up — short covering / bounce risk.";
      default:
        return "VWAP location and RSI slope do not confirm each other yet.";
    }
  }, [data?.stance]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Anchored VWAP + RSI trend</h2>
          <p className="text-sm text-zinc-400">
            Anchor to session open, weekly open, or the largest gap. RSI slope — not just the 30/70 level — confirms continuation versus exhaustion against your PCR bias.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-[#0c1a22] px-2 text-sm"
          >
            {(data?.symbols?.length ? data.symbols : UNIVERSE).map((u) => (
              <option key={u.symbol} value={u.symbol}>
                {u.symbol}
              </option>
            ))}
          </select>
          {(["session", "week", "gap"] as const).map((a) => (
            <Button key={a} size="sm" variant={anchor === a ? "default" : "outline"} onClick={() => setAnchor(a)}>
              {a === "gap" ? "Largest gap" : a === "week" ? "Weekly open" : "Session open"}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {loading && <p className="text-sm text-zinc-400">Anchoring VWAP…</p>}
      {data && !loading && (
        <>
          <div className="grid gap-2 sm:grid-cols-4">
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardDescription>Last</CardDescription>
                <CardTitle className="font-mono">{inr(data.bars.at(-1)!.close)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardDescription>Anchored VWAP</CardDescription>
                <CardTitle className="font-mono">{inr(data.vwap.vwap)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardDescription>RSI 14 · slope</CardDescription>
                <CardTitle className="font-mono">
                  {rsiLabel(data.rsi.value)}{" "}
                  <span className="text-sm font-normal text-zinc-400">{data.rsi.trend}</span>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/10 bg-white/4" size="sm">
              <CardHeader>
                <CardDescription>Divergence</CardDescription>
                <CardTitle className="text-base">
                  <Pill tone={data.divergence.type === "bullish" ? "long" : data.divergence.type === "bearish" ? "short" : "neutral"}>
                    {data.divergence.type}
                  </Pill>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card className="border-white/10 bg-white/4">
            <CardHeader>
              <CardTitle>Price, anchored VWAP (teal), RSI (amber)</CardTitle>
              <CardDescription>{stanceCopy}</CardDescription>
            </CardHeader>
            <CardContent>
              <Chart bars={data.bars} vwapSeries={data.vwapSeries} rsiSeries={data.rsiSeries} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
