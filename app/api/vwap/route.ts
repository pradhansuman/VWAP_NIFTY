import { NextResponse } from "next/server";
import { loadVwapBoard } from "@/lib/vwap-board";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(await loadVwapBoard(request));
}
