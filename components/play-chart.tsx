"use client";

import { memo } from "react";
import type { Bar } from "@/lib/types";
import type { PlaybookSnapshot } from "@/lib/playbook";

export const PlayChart = memo(function PlayChart({
  bars,
  vwapSeries,
  rsiSeries,
  snapshot,
  pdVwap,
  pwVwap,
  tsizeSeries,
}: {
  bars: Bar[];
  vwapSeries: number[];
  rsiSeries: number[];
  snapshot: PlaybookSnapshot;
  pdVwap?: number | null;
  pwVwap?: number | null;
  tsizeSeries?: number[];
}) {
  const w = 920;
  const h = 280;
  const rsiH = 90;
  const pad = 16;
  if (bars.length < 2) return <p className="text-sm text-zinc-500">Not enough 15m candles yet.</p>;
  const extras = [pdVwap, pwVwap, ...(tsizeSeries ?? [])].filter((v): v is number => Number.isFinite(v as number));
  const min = Math.min(...bars.map((b) => b.low), ...vwapSeries.filter(Number.isFinite), ...extras);
  const max = Math.max(...bars.map((b) => b.high), ...vwapSeries.filter(Number.isFinite), ...extras);
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
  const tsizeStart = tsizeSeries?.findIndex(Number.isFinite) ?? -1;
  const tsizePath =
    tsizeSeries
      ?.map((v, i) => (Number.isFinite(v) ? `${i === tsizeStart ? "M" : "L"} ${x(i)} ${y(v)}` : ""))
      .join(" ") ?? "";

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full min-w-[520px]">
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
        {Number.isFinite(pdVwap as number) && (
          <line x1={pad} x2={w - pad} y1={y(pdVwap!)} y2={y(pdVwap!)} stroke="#c4b5fd" strokeDasharray="5 4" strokeOpacity="0.9" />
        )}
        {Number.isFinite(pwVwap as number) && (
          <line x1={pad} x2={w - pad} y1={y(pwVwap!)} y2={y(pwVwap!)} stroke="#38bdf8" strokeDasharray="2 5" strokeOpacity="0.7" />
        )}
        {tsizePath && <path d={tsizePath} fill="none" stroke="#f472b6" strokeWidth="1.4" strokeDasharray="4 3" />}
        <path d={vwapPath} fill="none" stroke={vwapColor} strokeWidth="1.8" />
      </svg>
      <svg viewBox={`0 0 ${w} ${rsiH}`} className="mt-2 h-auto w-full min-w-[520px]">
        <line x1={pad} x2={w - pad} y1={rsiY(55)} y2={rsiY(55)} stroke="#34d399" strokeOpacity="0.25" />
        <line x1={pad} x2={w - pad} y1={rsiY(50)} y2={rsiY(50)} stroke="#94a3b8" strokeOpacity="0.45" />
        <line x1={pad} x2={w - pad} y1={rsiY(45)} y2={rsiY(45)} stroke="#fb7185" strokeOpacity="0.25" />
        <path d={rsiPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
      </svg>
      <p className="mt-1 text-[11px] text-zinc-500">
        Session VWAP (solid) · PD VWAP close (violet) · PW VWAP close (sky) · large-print t-size (pink) · amber rejection · dashed entry / stop / target
      </p>
    </div>
  );
});
