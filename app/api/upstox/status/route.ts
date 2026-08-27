import { NextResponse } from "next/server";
import { COOKIE_API_KEY, COOKIE_API_SECRET, COOKIE_TOKEN, cookieOptions, getCreds } from "@/lib/upstox/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const creds = getCreds(request);
  return NextResponse.json({
    connected: Boolean(creds.accessToken),
    hasApiKey: Boolean(creds.apiKey),
    hasApiSecret: Boolean(creds.apiSecret),
    redirectUri: creds.redirectUri,
    canOauth: Boolean(creds.apiKey && creds.apiSecret),
    tokenFromEnv: Boolean(process.env.UPSTOX_ACCESS_TOKEN?.trim()),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  const res = NextResponse.json({ ok: true, connected: Boolean(body.accessToken?.trim() || getCreds(request).accessToken) });
  const opts = cookieOptions();
  if (body.apiKey?.trim()) res.cookies.set(COOKIE_API_KEY, body.apiKey.trim(), opts);
  if (body.apiSecret?.trim()) res.cookies.set(COOKIE_API_SECRET, body.apiSecret.trim(), opts);
  if (body.accessToken?.trim()) res.cookies.set(COOKIE_TOKEN, body.accessToken.trim(), opts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const opts = { ...cookieOptions(), maxAge: 0 };
  res.cookies.set(COOKIE_TOKEN, "", opts);
  res.cookies.set(COOKIE_API_KEY, "", opts);
  res.cookies.set(COOKIE_API_SECRET, "", opts);
  return res;
}
