import { NextResponse } from "next/server";
import { loadDesk } from "@/lib/desk";
import { confluencePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const desk = await loadDesk(request);
  return NextResponse.json(confluencePayload(desk));
}
