"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/pills";

type Status = {
  connected: boolean;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  redirectUri: string;
  canOauth: boolean;
  tokenFromEnv: boolean;
};

export function ConnectView() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch("/api/upstox/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError("Could not read Upstox status."));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const err = params.get("error");
    fetch("/api/upstox/status")
      .then((r) => r.json())
      .then((json) => {
        setStatus(json);
        if (connected) setNote("Upstox access token saved. The desk will pull live candles.");
        if (err) setError(err);
      })
      .catch(() => setError("Could not read Upstox status."));
  }, []);

  async function save(body: Record<string, string>) {
    setError(null);
    setNote(null);
    const res = await fetch("/api/upstox/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError("Could not save credentials.");
      return;
    }
    setNote("Saved. Reload the MTF desk to fetch live Nifty candles.");
    refresh();
  }

  async function disconnect() {
    await fetch("/api/upstox/status", { method: "DELETE" });
    setNote("Disconnected. Simulator is back on.");
    refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Connect Upstox</h2>
        <p className="text-sm text-zinc-400">
          Paste an access token or log in with your API app. Until then the desk keeps using the IST session simulator.
        </p>
      </div>
      {status && (
        <div className="flex flex-wrap gap-2">
          <Pill tone={status.connected ? "long" : "neutral"}>{status.connected ? "Token present" : "No token"}</Pill>
          <Pill tone={status.canOauth ? "long" : "neutral"}>{status.canOauth ? "OAuth ready" : "Need API key + secret"}</Pill>
          {status.tokenFromEnv && <Pill tone="warn">Token also set in env</Pill>}
        </div>
      )}
      {note && <p className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">{note}</p>}
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      <Card className="border-white/10 bg-white/4">
        <CardHeader>
          <CardTitle>1. Access token</CardTitle>
          <CardDescription>
            Fastest path: paste a daily access token or a long-lived analytics token from the Upstox developer console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="eyJhbGciOi…"
            className="bg-white/5 font-mono text-xs"
          />
          <Button onClick={() => save({ accessToken })} disabled={!accessToken.trim()}>
            Use this token
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/4">
        <CardHeader>
          <CardTitle>2. API app (OAuth)</CardTitle>
          <CardDescription>
            Create an app at account.upstox.com/developer/apps. Redirect URI must match exactly:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-teal-200">{status?.redirectUri}</p>
          <label className="block text-xs text-zinc-400">
            API key
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mt-1 bg-white/5" />
          </label>
          <label className="block text-xs text-zinc-400">
            API secret
            <Input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="mt-1 bg-white/5"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => save({ apiKey, apiSecret })}
              disabled={!apiKey.trim() || !apiSecret.trim()}
            >
              Save app
            </Button>
            <a href="/api/upstox/login" className={buttonVariants()}>
              Login with Upstox
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="destructive" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}
