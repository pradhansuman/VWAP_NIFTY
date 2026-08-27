"use client";

import { useEffect, useRef, useState } from "react";

export function useLiveJson<T>(url: string, initial: T | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const hasData = useRef(Boolean(initial));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T & { error?: string };
        if (cancelled) return;
        if (json && typeof json === "object" && "error" in json && json.error) {
          throw new Error(String(json.error));
        }
        hasData.current = true;
        setError(null);
        setData(json);
      } catch {
        if (!cancelled && !hasData.current) setError("Could not load this view.");
      } finally {
        inflight.current = false;
      }
    };
    if (!hasData.current) void load();
    if (intervalMs <= 0) {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, error };
}
