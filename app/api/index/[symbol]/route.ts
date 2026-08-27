import { NextResponse } from "next/server";
import { loadIndexWindow, INDEX_WINDOWS, type IndexWindowId } from "@/lib/index-window";
import { indexPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;
  const id = symbol.toUpperCase() as IndexWindowId;
  if (!(id in INDEX_WINDOWS)) {
    return NextResponse.json({ error: "Unknown index window" }, { status: 404 });
  }
  const now = Date.now();
  const pack = await loadIndexWindow(id, request, now);
  return NextResponse.json(indexPayload(pack, now));
}
