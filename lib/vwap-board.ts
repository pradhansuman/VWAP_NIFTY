import { loadIndexWindow, type IndexWindowId } from "@/lib/index-window";
import { loadBitcoinDesk, btcPlaybook } from "@/lib/bitcoin/desk";
import { evaluatePlaybook } from "@/lib/playbook";
import { buildVwapMap } from "@/lib/vwap-context";
import { formatIstClock } from "@/lib/session";

const INDEXES: { id: IndexWindowId; href: string; title: string }[] = [
  { id: "NIFTY", href: "/nifty", title: "Nifty 50 · IST session VWAP" },
  { id: "BANKNIFTY", href: "/banknifty", title: "Bank Nifty · IST session VWAP" },
  { id: "SENSEX", href: "/sensex", title: "Sensex · IST session VWAP" },
];

export async function loadVwapBoard(request?: Request, now = Date.now()) {
  const [indexes, btc] = await Promise.all([
    Promise.all(INDEXES.map(async (item) => ({ item, pack: await loadIndexWindow(item.id, request, now) }))),
    loadBitcoinDesk(now),
  ]);

  const names: Array<{
    id: string;
    href: string;
    title: string;
    clock: string;
    kind: "inr" | "usd";
    map: ReturnType<typeof buildVwapMap>;
    bars: ReturnType<typeof evaluatePlaybook>["bars"];
    vwapSeries: number[];
    rsiSeries: number[];
    snapshot: ReturnType<typeof evaluatePlaybook>["snapshot"];
    tsizeSeries: number[];
  }> = indexes.map(({ item, pack }) => {
    const play = evaluatePlaybook(pack.indexBars, { clock: "ist", nowMs: now, vix: pack.vix });
    const map = buildVwapMap(pack.indexBars, "ist");
    const bars = play.bars.slice(-80);
    return {
      id: item.id,
      href: item.href,
      title: item.title,
      clock: formatIstClock(now),
      kind: "inr",
      map,
      bars,
      vwapSeries: play.vwap.slice(-80),
      rsiSeries: play.rsi.slice(-80),
      snapshot: play.snapshot,
      tsizeSeries: buildVwapMap(play.bars, "ist").tsize.largeSeries.slice(-80),
    };
  });

  const btcPlay = btcPlaybook(btc.bars);
  const btcMap = buildVwapMap(btc.bars, "utc");
  names.push({
    id: "BTCUSDT",
    href: "/bitcoin",
    title: "Bitcoin · UTC-day VWAP",
    clock:
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(now) + " UTC",
    kind: "usd",
    map: btcMap,
    bars: btcPlay.bars.slice(-80),
    vwapSeries: btcPlay.vwap.slice(-80),
    rsiSeries: btcPlay.rsi.slice(-80),
    snapshot: btcPlay.snapshot,
    tsizeSeries: buildVwapMap(btcPlay.bars, "utc").tsize.largeSeries.slice(-80),
  });

  const live = indexes.filter((x) => x.pack.source === "upstox").length;
  return {
    generatedAt: now,
    clock: formatIstClock(now),
    sourceNote:
      live > 0
        ? `Live Upstox on ${live} index window${live === 1 ? "" : "s"} · BTC ${btc.source}`
        : `Simulator on indexes · BTC ${btc.source}`,
    names,
  };
}
