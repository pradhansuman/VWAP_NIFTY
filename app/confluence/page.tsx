import { Suspense } from "react";
import { ConfluenceView } from "@/components/confluence-view";
import { loadDesk } from "@/lib/desk";
import { confluencePayload } from "@/lib/payloads";

async function Body() {
  const pack = await loadDesk();
  return <ConfluenceView initial={confluencePayload(pack)} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Checking VWAP reclaim against RSI divergence…</p>}>
      <Body />
    </Suspense>
  );
}
