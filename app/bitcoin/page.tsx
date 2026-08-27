import { Suspense } from "react";
import { BitcoinView } from "@/components/bitcoin-view";
import { loadBitcoinDesk } from "@/lib/bitcoin/desk";
import { bitcoinPayload } from "@/lib/payloads";

async function Body() {
  const now = Date.now();
  const pack = await loadBitcoinDesk(now);
  return <BitcoinView initial={bitcoinPayload(pack, now)} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Loading BTCUSDT UTC VWAP…</p>}>
      <Body />
    </Suspense>
  );
}
