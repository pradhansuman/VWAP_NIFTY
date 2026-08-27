import { NextResponse } from "next/server";
import { loadDesk } from "@/lib/desk";
import { dashboardPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = Date.now();
  const desk = await loadDesk(request, now);
  return NextResponse.json(dashboardPayload(desk, now));
}
