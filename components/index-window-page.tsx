import { Suspense } from "react";
import { IndexWindowView } from "@/components/index-window-view";
import { loadIndexWindow, type IndexWindowId } from "@/lib/index-window";
import { indexPayload } from "@/lib/payloads";

async function Body({ symbol, compact }: { symbol: IndexWindowId; compact?: boolean }) {
  const now = Date.now();
  const pack = await loadIndexWindow(symbol, undefined, now);
  return <IndexWindowView symbol={symbol} compact={compact} initial={indexPayload(pack, now)} />;
}

export function IndexWindowPage({ symbol, compact = false }: { symbol: IndexWindowId; compact?: boolean }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Loading {symbol} session VWAP…</p>}>
      <Body symbol={symbol} compact={compact} />
    </Suspense>
  );
}
