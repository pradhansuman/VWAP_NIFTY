export const COOKIE_TOKEN = "upstox_access_token";
export const COOKIE_API_KEY = "upstox_api_key";
export const COOKIE_API_SECRET = "upstox_api_secret";

const TOKEN_MAX_AGE = 60 * 60 * 20;

export type UpstoxCreds = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  redirectUri: string;
};

function cookieMap(request?: Request) {
  const header = request?.headers.get("cookie") ?? "";
  const map = new Map<string, string>();
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) map.set(key, value);
  }
  return map;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  };
}

export function originFrom(request: Request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function getCreds(request?: Request): UpstoxCreds {
  const cookies = cookieMap(request);
  const apiKey = process.env.UPSTOX_API_KEY?.trim() || cookies.get(COOKIE_API_KEY) || "";
  const apiSecret = process.env.UPSTOX_API_SECRET?.trim() || cookies.get(COOKIE_API_SECRET) || "";
  const accessToken = process.env.UPSTOX_ACCESS_TOKEN?.trim() || cookies.get(COOKIE_TOKEN) || "";
  const redirectUri =
    process.env.UPSTOX_REDIRECT_URI?.trim() ||
    (request ? `${originFrom(request)}/api/upstox/callback` : "http://127.0.0.1:43127/api/upstox/callback");
  return { apiKey, apiSecret, accessToken, redirectUri };
}

export function authorizeUrl(creds: UpstoxCreds) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: creds.apiKey,
    redirect_uri: creds.redirectUri,
  });
  return `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;
}

export async function exchangeCode(creds: Pick<UpstoxCreds, "apiKey" | "apiSecret" | "redirectUri">, code: string) {
  const body = new URLSearchParams({
    code,
    client_id: creds.apiKey,
    client_secret: creds.apiSecret,
    redirect_uri: creds.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://api.upstox.com/v2/login/authorization/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    },
    body,
  });
  const json = (await res.json()) as { access_token?: string; errors?: { message?: string }[] };
  if (!res.ok || !json.access_token) {
    const msg = json.errors?.[0]?.message || `Upstox token exchange failed (${res.status})`;
    throw new Error(msg);
  }
  return json.access_token;
}
