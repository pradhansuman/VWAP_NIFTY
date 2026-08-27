import { NextResponse } from "next/server";
import { COOKIE_TOKEN, cookieOptions, exchangeCode, getCreds } from "@/lib/upstox/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err || !code) {
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(err || "no_code")}`, request.url));
  }
  try {
    const creds = getCreds(request);
    const token = await exchangeCode(creds, code);
    const res = NextResponse.redirect(new URL("/connect?connected=1", request.url));
    res.cookies.set(COOKIE_TOKEN, token, cookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "token_failed";
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(message)}`, request.url));
  }
}
