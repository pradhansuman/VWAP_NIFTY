import type { Bar } from "@/lib/types";
import { typicalPrice, utcDateKey } from "@/lib/indicators";
import { istDateKey, istMonthKey, istWeekKey } from "@/lib/session";

export type VwapCalendar = "ist" | "utc";

export type VwapControl = "buyers" | "sellers" | "fair";

export type FadeSide = "fade_long" | "fade_short" | "none";

export type TsizeDivergence = "large_weaker" | "large_stronger" | "aligned" | "n/a";

export type VwapMap = {
  last: number;
  sessionVwap: number;
  control: VwapControl;
  controlNote: string;
  volumeNote: string;
  closes: {
    pd: number | null;
    pw: number | null;
    pm: number | null;
    liveWeek: number | null;
    liveMonth: number | null;
  };
  magnet: { level: number; label: string; distPct: number } | null;
  fade: {
    ok: boolean;
    side: FadeSide;
    spentAwayBars: number;
    maxAwayPct: number;
    approaching: boolean;
    reclaimed: boolean;
    volumeIntoVwap: boolean;
    reason: string;
  };
  tsize: {
    available: boolean;
    allVwap: number;
    largeVwap: number | null;
    largeSeries: number[];
    divergence: TsizeDivergence;
    addOk: boolean;
    note: string;
  };
  add: {
    ok: boolean;
    reason: string;
  };
};

function utcWeekKey(ms: number) {
  const d = new Date(ms);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset);
  return new Date(monday).toISOString().slice(0, 10);
}

function utcMonthKey(ms: number) {
  return new Date(ms).toISOString().slice(0, 7);
}

export function calendarKeys(calendar: VwapCalendar) {
  if (calendar === "utc") {
    return { day: utcDateKey, week: utcWeekKey, month: utcMonthKey };
  }
  return { day: istDateKey, week: istWeekKey, month: istMonthKey };
}

function barWeight(bar: Bar, allowUnitFallback: boolean) {
  if (bar.volume > 0) return bar.volume;
  return allowUnitFallback ? 1 : 0;
}

export function hasTradedVolume(bars: Bar[]) {
  if (bars.length < 8) return false;
  const real = bars.filter((b) => b.volume > 1).length;
  return real / bars.length >= 0.25;
}

function periodCloses(bars: Bar[], keyFn: (ms: number) => string, allowUnitFallback: boolean) {
  const completed: { key: string; vwap: number }[] = [];
  let key = "";
  let pv = 0;
  let vol = 0;
  for (const bar of bars) {
    const next = keyFn(bar.time);
    if (next !== key) {
      if (key && vol > 0) completed.push({ key, vwap: pv / vol });
      key = next;
      pv = 0;
      vol = 0;
    }
    const w = barWeight(bar, allowUnitFallback);
    if (w <= 0) continue;
    pv += typicalPrice(bar) * w;
    vol += w;
  }
  const live = key && vol > 0 ? pv / vol : null;
  return { completed, liveKey: key, live };
}

function previousClose(completed: { key: string; vwap: number }[], liveKey: string) {
  for (let i = completed.length - 1; i >= 0; i--) {
    if (completed[i].key !== liveKey) return completed[i].vwap;
  }
  return null;
}

function sessionRunning(bars: Bar[], dayKey: (ms: number) => string, allowUnitFallback: boolean) {
  const lastKey = bars.length ? dayKey(bars[bars.length - 1].time) : "";
  let pv = 0;
  let vol = 0;
  const series: number[] = [];
  for (const bar of bars) {
    if (dayKey(bar.time) !== lastKey) {
      series.push(Number.NaN);
      continue;
    }
    const w = barWeight(bar, allowUnitFallback);
    if (w <= 0) {
      series.push(vol > 0 ? pv / vol : Number.NaN);
      continue;
    }
    pv += typicalPrice(bar) * w;
    vol += w;
    series.push(pv / vol);
  }
  return { series, vwap: vol > 0 ? pv / vol : (bars.at(-1)?.close ?? 0) };
}

function percentile(values: number[], p: number) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return 0;
  return s[Math.floor((s.length - 1) * p)];
}

function tsizeOn(bars: Bar[], dayKey: (ms: number) => string) {
  const lastKey = bars.length ? dayKey(bars[bars.length - 1].time) : "";
  const session = bars.filter((b) => dayKey(b.time) === lastKey);
  const available = hasTradedVolume(session.length ? session : bars);
  const use = session.length >= 8 ? session : bars;
  const vols = use.map((b) => b.volume).filter((v) => v > 0);
  const cutoff = vols.length ? percentile(vols, 0.7) : Infinity;
  let allPv = 0;
  let allVol = 0;
  let largePv = 0;
  let largeVol = 0;
  const largeSeries: number[] = [];
  for (const bar of bars) {
    if (dayKey(bar.time) !== lastKey) {
      largeSeries.push(Number.NaN);
      continue;
    }
    const tp = typicalPrice(bar);
    if (bar.volume > 0) {
      allPv += tp * bar.volume;
      allVol += bar.volume;
      if (bar.volume >= cutoff && cutoff > 0) {
        largePv += tp * bar.volume;
        largeVol += bar.volume;
      }
    } else if (!available) {
      allPv += tp;
      allVol += 1;
    }
    largeSeries.push(largeVol > 0 ? largePv / largeVol : Number.NaN);
  }
  const last = bars.at(-1)?.close ?? 0;
  const allVwap = allVol > 0 ? allPv / allVol : last;
  const largeVwap = largeVol > 0 ? largePv / largeVol : null;
  if (!available) {
    return {
      available: false,
      allVwap,
      largeVwap: null,
      largeSeries,
      divergence: "n/a" as const,
      addOk: true,
      note: "No traded size on these prints — this VWAP is time-weighted (each bar counts as 1). T-size needs stocks or Bitcoin.",
    };
  }
  if (largeVwap == null) {
    return {
      available: true,
      allVwap,
      largeVwap: null,
      largeSeries,
      divergence: "aligned" as const,
      addOk: true,
      note: "Not enough large prints yet to split t-size VWAP from the tape.",
    };
  }
  const priceAbove = last >= allVwap;
  const largeBelowAll = largeVwap < allVwap * 0.999;
  const largeAboveAll = largeVwap > allVwap * 1.001;
  let divergence: TsizeDivergence = "aligned";
  let addOk = true;
  let note = "Large-print VWAP is tracking session VWAP — size is not leaking against the tape.";
  if (priceAbove && largeBelowAll) {
    divergence = "large_weaker";
    addOk = false;
    note =
      "Large-size VWAP is diverting lower while price holds an uptrend. That often prints before momentum breaks — do not add.";
  } else if (!priceAbove && largeAboveAll) {
    divergence = "large_weaker";
    addOk = false;
    note =
      "Large-size VWAP is holding higher while price trades below session VWAP. Size is not confirming the sell — do not add shorts.";
  } else if (priceAbove && largeAboveAll) {
    divergence = "large_stronger";
    note = "Large-size VWAP is leading higher with the uptrend — size agrees with buyers.";
  } else if (!priceAbove && largeBelowAll) {
    divergence = "large_stronger";
    note = "Large-size VWAP is leading lower with the downtrend — size agrees with sellers.";
  }
  return { available: true, allVwap, largeVwap, largeSeries, divergence, addOk, note };
}

function fadeContext(bars: Bar[], vwapSeries: number[], last: number, sessionVwap: number) {
  const n = bars.length;
  const awayThresh = 0.0018;
  const dist = (i: number) => {
    const v = vwapSeries[i];
    if (!Number.isFinite(v) || v === 0) return 0;
    return (bars[i].close - v) / v;
  };
  const lastI = n - 1;
  const dNow = dist(lastI);
  const dPrev = n >= 2 ? dist(lastI - 1) : dNow;
  const dPrev2 = n >= 3 ? dist(lastI - 2) : dNow;
  const approaching = Math.abs(dNow) < Math.abs(dPrev) && Math.abs(dPrev) <= Math.abs(dPrev2) + 1e-9;
  let streak = 0;
  let maxAway = 0;
  for (let i = lastI; i >= 0; i--) {
    const ad = Math.abs(dist(i));
    if (!Number.isFinite(vwapSeries[i])) break;
    if (ad < awayThresh) {
      if (streak > 0) break;
      continue;
    }
    streak += 1;
    maxAway = Math.max(maxAway, ad * 100);
    if (streak > 80) break;
  }
  const spentAway = streak >= 6 && maxAway >= 0.35;
  let reclaimed = false;
  let lost = false;
  if (n >= 3) {
    const v0 = vwapSeries[lastI];
    const v1 = vwapSeries[lastI - 1];
    if (Number.isFinite(v0) && Number.isFinite(v1)) {
      reclaimed = bars[lastI - 1].close < v1 && bars[lastI].close >= v0;
      lost = bars[lastI - 1].close > v1 && bars[lastI].close <= v0;
    }
  }
  const sessionVols = bars.slice(-40).map((b) => b.volume).filter((v) => v > 0);
  const avgVol = sessionVols.length ? sessionVols.reduce((a, b) => a + b, 0) / sessionVols.length : 0;
  const recentVol = bars.slice(-3).reduce((a, b) => a + b.volume, 0) / 3;
  const volumeIntoVwap = avgVol > 0 && recentVol > avgVol * 1.2 && approaching;

  let side: FadeSide = "none";
  if (approaching && dNow > 0) side = "fade_short";
  if (approaching && dNow < 0) side = "fade_long";

  if (reclaimed) {
    return {
      ok: false,
      side: "none" as const,
      spentAwayBars: streak,
      maxAwayPct: maxAway,
      approaching,
      reclaimed: true,
      volumeIntoVwap,
      reason:
        "Session VWAP just reclaimed. Treat buyers as in control again — do not fade the reclaim.",
    };
  }
  if (lost) {
    return {
      ok: false,
      side: "none" as const,
      spentAwayBars: streak,
      maxAwayPct: maxAway,
      approaching,
      reclaimed: false,
      volumeIntoVwap,
      reason: "Session VWAP just lost. Treat sellers as in control — do not fade the breakdown back to fair value.",
    };
  }
  if (!approaching) {
    return {
      ok: false,
      side: "none" as const,
      spentAwayBars: streak,
      maxAwayPct: maxAway,
      approaching,
      reclaimed: false,
      volumeIntoVwap,
      reason:
        last >= sessionVwap
          ? "Price is not reverting into VWAP yet. Buyers still in control above fair value."
          : "Price is not reverting into VWAP yet. Sellers still in control below fair value.",
    };
  }
  if (!spentAway) {
    return {
      ok: false,
      side,
      spentAwayBars: streak,
      maxAwayPct: maxAway,
      approaching,
      reclaimed: false,
      volumeIntoVwap,
      reason:
        "Price never spent real time away from VWAP. Fading every tag into fair value is how you bleed.",
    };
  }
  const ok = true;
  const reason = volumeIntoVwap
    ? side === "fade_short"
      ? "Spent time above VWAP, now driving back in on expanding volume — new longs can get absorbed by passive sellers at fair value."
      : "Spent time below VWAP, now driving back in on expanding volume — new shorts can get absorbed by passive buyers at fair value."
    : side === "fade_short"
      ? "Spent time away above VWAP and is reverting toward it. Fade only with that context — not every touch."
      : "Spent time away below VWAP and is reverting toward it. Fade only with that context — not every touch.";
  return {
    ok,
    side,
    spentAwayBars: streak,
    maxAwayPct: maxAway,
    approaching,
    reclaimed: false,
    volumeIntoVwap,
    reason,
  };
}

function addStance(last: number, sessionVwap: number, tsize: VwapMap["tsize"], reclaimed: boolean, lost: boolean) {
  if (reclaimed) {
    return { ok: true, reason: "VWAP reclaimed — buyers in control. Adds on the long side are allowed if size agrees." };
  }
  if (lost) {
    return { ok: false, reason: "Trend VWAP lost — the move looks weaker. Do not add." };
  }
  if (!tsize.addOk) {
    return { ok: false, reason: tsize.note };
  }
  if (last >= sessionVwap) {
    return { ok: true, reason: "Holding the session VWAP. Adds are allowed while large-print VWAP agrees." };
  }
  return { ok: false, reason: "Trading below session VWAP. Do not add longs until fair value is reclaimed." };
}

export function buildVwapMap(bars: Bar[], calendar: VwapCalendar = "ist"): VwapMap {
  const keys = calendarKeys(calendar);
  const volumeOk = hasTradedVolume(bars);
  const allowUnit = !volumeOk;
  const last = bars.at(-1)?.close ?? 0;
  const session = sessionRunning(bars, keys.day, allowUnit);
  const days = periodCloses(bars, keys.day, allowUnit);
  const weeks = periodCloses(bars, keys.week, allowUnit);
  const months = periodCloses(bars, keys.month, allowUnit);
  const pd = previousClose(days.completed, days.liveKey);
  const pw = previousClose(weeks.completed, weeks.liveKey);
  const pm = previousClose(months.completed, months.liveKey);
  const control: VwapControl =
    Math.abs(last - session.vwap) / Math.max(session.vwap, 1e-9) < 0.0005
      ? "fair"
      : last > session.vwap
        ? "buyers"
        : "sellers";
  const controlNote =
    control === "buyers"
      ? "Price above VWAP — buyers in control of the session."
      : control === "sellers"
        ? "Price below VWAP — sellers in control of the session."
        : "Price is at VWAP — fair value, no side in control.";
  const tsize = tsizeOn(bars, keys.day);
  const fade = fadeContext(bars, session.series, last, session.vwap);
  const magnets = [
    pd != null ? { level: pd, label: "Previous-day VWAP close", distPct: ((pd - last) / last) * 100 } : null,
    pw != null ? { level: pw, label: "Previous-week VWAP close", distPct: ((pw - last) / last) * 100 } : null,
    pm != null ? { level: pm, label: "Previous-month VWAP close", distPct: ((pm - last) / last) * 100 } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);
  const magnet =
    magnets.sort((a, b) => Math.abs(a.distPct) - Math.abs(b.distPct))[0] ??
    (session.vwap
      ? {
          level: session.vwap,
          label: "Session VWAP",
          distPct: ((session.vwap - last) / Math.max(last, 1e-9)) * 100,
        }
      : null);
  const lost = fade.reason.includes("just lost");
  return {
    last,
    sessionVwap: session.vwap,
    control,
    controlNote,
    volumeNote: volumeOk
      ? "VWAP is Σ(price × size) / Σ(size) on these candles (typical price × volume)."
      : "These prints have no traded volume, so each bar is weighted as 1 — a time VWAP, not a true volume VWAP.",
    closes: {
      pd,
      pw,
      pm,
      liveWeek: weeks.live,
      liveMonth: months.live,
    },
    magnet,
    fade,
    tsize,
    add: addStance(last, session.vwap, tsize, fade.reclaimed, lost),
  };
}

export function sliceTsizeSeries(series: number[], keep: number) {
  return series.slice(-keep);
}
