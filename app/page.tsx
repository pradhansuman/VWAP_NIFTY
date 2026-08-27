import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { loadDesk } from "@/lib/desk";
import { dashboardPayload } from "@/lib/payloads";

async function Body() {
  const now = Date.now();
  const pack = await loadDesk(undefined, now);
  return <DashboardView initial={dashboardPayload(pack, now)} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Building session VWAP and RSI…</p>}>
      <Body />
    </Suspense>
  );
}
