import { NextResponse } from "next/server";
import { getCreds } from "@/lib/upstox/auth";
import { fetchLtpMap } from "@/lib/upstox/quotes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("keys") ?? "";
  const keys = raw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 40);
  const { accessToken } = getCreds(request);
  if (!accessToken || keys.length === 0) {
    return NextResponse.json({ quotes: {} });
  }
  try {
    const map = await fetchLtpMap(accessToken, keys);
    const quotes: Record<string, { last: number; prevClose: number }> = {};
    for (const [key, q] of map) quotes[key] = { last: q.last, prevClose: q.prevClose };
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ quotes: {} });
  }
}
