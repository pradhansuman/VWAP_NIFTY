"use client";

import Link from "next/link";
import { useLiveJson } from "@/lib/use-live-json";
import type { VwapMap } from "@/lib/vwap-context";
import { inr, usd } from "@/lib/format";
import { VwapMapPanel } from "@/components/vwap-map-panel";
import { PlayChart } from "@/components/play-chart";
import { Pill } from "@/components/pills";
import type { PlaybookSnapshot } from "@/lib/playbook";
import type { Bar } from "@/lib/types";

type Name = {
  id: string;
  href: string;
  title: string;
  clock: string;
  kind: "inr" | "usd";
  map: VwapMap;
  bars: Bar[];
  vwapSeries: number[];
  rsiSeries: number[];
  snapshot: PlaybookSnapshot;
  tsizeSeries: number[];
};

type Payload = {
  clock: string;
  sourceNote: string;
  names: Name[];
};

export function VwapMapView({ initial = null }: { initial?: Payload | null }) {
  const { data, error } = useLiveJson<Payload>("/api/vwap", initial, 20_000);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-teal-300/80 uppercase">VWAP map</p>
        <h2 className="text-lg font-semibold">Fair value, closes, fades, and size</h2>
        <p className="max-w-3xl text-sm text-zinc-400">
          VWAP is the average fill of volume so far: Σ(price × size) / Σ(size). It ignores the clock and only cares about
          events. Price above it means buyers are in control; below it, sellers. Time-based VWAP resets at the day / week /
          month open. Do not fade every tag — wait until price has spent time away, then watch the reversion. Previous-period
          VWAP close is the magnet. T-size splits large prints; if that line leaks against the trend, do not add.
        </p>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {!data && !error && <p className="text-sm text-zinc-400">Building session VWAP maps…</p>}

      {data && (
        <>
          <p className="text-xs text-zinc-500">
            {data.sourceNote} · {data.clock}
          </p>
          {data.names.map((name) => (
            <section key={name.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{name.title}</h3>
                  <p className="text-xs text-zinc-500">{name.clock}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={name.map.control === "buyers" ? "long" : name.map.control === "sellers" ? "short" : "neutral"}>
                    Last {name.kind === "usd" ? usd(name.map.last) : inr(name.map.last)}
                  </Pill>
                  <Link href={name.href} className="text-xs text-teal-300 hover:underline">
                    Open desk
                  </Link>
                </div>
              </div>
              <VwapMapPanel map={name.map} kind={name.kind} />
              <PlayChart
                bars={name.bars}
                vwapSeries={name.vwapSeries}
                rsiSeries={name.rsiSeries}
                snapshot={name.snapshot}
                pdVwap={name.map.closes.pd}
                pwVwap={name.map.closes.pw}
                tsizeSeries={name.tsizeSeries}
              />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
