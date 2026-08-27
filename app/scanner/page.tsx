import { Suspense } from "react";
import { ScannerView } from "@/components/scanner-view";
import { loadDesk } from "@/lib/desk";
import { scannerPayload } from "@/lib/payloads";

async function Body() {
  const now = Date.now();
  const pack = await loadDesk(undefined, now);
  return <ScannerView initial={scannerPayload(pack, now)} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Screening Nifty 50 for VWAP extremes…</p>}>
      <Body />
    </Suspense>
  );
}
