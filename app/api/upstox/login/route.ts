import { NextResponse } from "next/server";
import { authorizeUrl, getCreds } from "@/lib/upstox/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = getCreds(request);
  if (!creds.apiKey || !creds.apiSecret) {
    return NextResponse.redirect(new URL("/connect?error=missing_app", request.url));
  }
  return NextResponse.redirect(authorizeUrl(creds));
}
