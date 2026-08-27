import type { DeskPack } from "@/lib/desk";
import type { IndexWindowPack } from "@/lib/index-window";
import type { BtcDesk } from "@/lib/bitcoin/desk";
import { getScanner, niftyTape } from "@/lib/market";
import { formatIstClock, sessionStatus } from "@/lib/session";

export function dashboardPayload(pack: DeskPack, now: number) {
  return {
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    source: pack.source,
    sourceNote: pack.sourceNote,
    tape: niftyTape(pack.rows, now),
    rows: pack.rows,
    symbols: pack.symbols,
  };
}

export function scannerPayload(pack: DeskPack, now: number) {
  return {
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    source: pack.source,
    sourceNote: pack.sourceNote,
    tape: niftyTape(pack.rows, now),
    hits: getScanner(pack.rows, now),
  };
}

export function confluencePayload(pack: DeskPack) {
  const signals = pack.rows
    .map((row) => ({
      instrument: row.instrument,
      pcr: row.pcr,
      pcrBias: row.pcrBias,
      tf: row.timeframes["5m"],
    }))
    .filter((r) => r.tf.confluence.side !== "none" || r.tf.divergence.type !== "none")
    .sort((a, b) => {
      const rank = (s: string) => (s === "long" || s === "short" ? 0 : 1);
      return rank(a.tf.confluence.side) - rank(b.tf.confluence.side);
    });
  return { source: pack.source, sourceNote: pack.sourceNote, signals };
}

export function indexPayload(pack: IndexWindowPack, now: number) {
  const indexRow = pack.rows.find((r) => r.instrument.symbol === pack.instrument.symbol) ?? pack.rows[0];
  const tf = indexRow.timeframes["5m"];
  return {
    generatedAt: now,
    clock: formatIstClock(now),
    session: sessionStatus(now),
    source: pack.source,
    sourceNote: pack.sourceNote,
    meta: pack.meta,
    instrument: pack.instrument,
    pcr: pack.pcr,
    pcrBias: pack.pcrBias,
    symbols: pack.symbols,
    rows: pack.rows,
    tape: {
      last: tf.last,
      changePct: tf.changePct,
      vwap: tf.vwap,
      rsi: tf.rsi,
      confluence: tf.confluence,
    },
  };
}

export function bitcoinPayload(pack: BtcDesk, now: number) {
  const tf = pack.row.timeframes["5m"];
  const clock =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(now) + " UTC";
  return {
    generatedAt: now,
    clock,
    source: pack.source,
    sourceNote: pack.sourceNote,
    instrument: pack.instrument,
    row: pack.row,
    tape: {
      last: tf.last,
      changePct: tf.changePct,
      vwap: tf.vwap,
      rsi: tf.rsi,
      confluence: tf.confluence,
    },
  };
}
