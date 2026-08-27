import { Suspense } from "react";
import { VwapMapView } from "@/components/vwap-map-view";
import { loadVwapBoard } from "@/lib/vwap-board";

async function Body() {
  const payload = await loadVwapBoard();
  return <VwapMapView initial={payload} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Building session VWAP maps…</p>}>
      <Body />
    </Suspense>
  );
}
