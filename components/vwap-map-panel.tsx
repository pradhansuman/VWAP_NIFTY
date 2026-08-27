"use client";

import type { VwapMap } from "@/lib/vwap-context";
import { inr, pct, usd } from "@/lib/format";
import { Pill } from "@/components/pills";
import { cn } from "@/lib/utils";

function money(n: number, kind: "inr" | "usd") {
  return kind === "usd" ? usd(n) : inr(n);
}

export function VwapMapPanel({
  map,
  kind = "inr",
  compact = false,
}: {
  map: VwapMap;
  kind?: "inr" | "usd";
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4")}>
        <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
          <p className="text-[11px] text-zinc-400">Fair value</p>
          <p className="font-mono text-lg tabular-nums">{money(map.sessionVwap, kind)}</p>
          <Pill tone={map.control === "buyers" ? "long" : map.control === "sellers" ? "short" : "neutral"}>
            {map.control === "buyers" ? "Buyers in control" : map.control === "sellers" ? "Sellers in control" : "At VWAP"}
          </Pill>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
          <p className="text-[11px] text-zinc-400">PD VWAP close</p>
          <p className="font-mono text-lg tabular-nums">{map.closes.pd != null ? money(map.closes.pd, kind) : "—"}</p>
          <p className="text-[11px] text-zinc-500">Magnet for mean reversion</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
          <p className="text-[11px] text-zinc-400">Fade into VWAP</p>
          <p className="text-sm text-zinc-200">{map.fade.ok ? (map.fade.side === "fade_short" ? "Fade shorts" : "Fade longs") : "Do not fade"}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">{map.fade.reason}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2">
          <p className="text-[11px] text-zinc-400">Add / t-size</p>
          <p className="text-sm text-zinc-200">{map.add.ok ? "Adds allowed" : "Do not add"}</p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">{map.tsize.available ? map.tsize.note : map.add.reason}</p>
        </div>
      </div>
      {!compact && (
        <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
          <p>
            PW close {map.closes.pw != null ? money(map.closes.pw, kind) : "—"}
            {map.closes.liveWeek != null ? ` · week VWAP ${money(map.closes.liveWeek, kind)}` : ""}
          </p>
          <p>
            PM close {map.closes.pm != null ? money(map.closes.pm, kind) : "—"}
            {map.closes.liveMonth != null ? ` · month VWAP ${money(map.closes.liveMonth, kind)}` : ""}
          </p>
          <p>
            {map.magnet
              ? `${map.magnet.label} ${money(map.magnet.level, kind)} (${pct(map.magnet.distPct)} from last)`
              : "No prior VWAP close in this history window."}
          </p>
        </div>
      )}
      <p className="text-[11px] text-zinc-600">{map.volumeNote}</p>
    </div>
  );
}
