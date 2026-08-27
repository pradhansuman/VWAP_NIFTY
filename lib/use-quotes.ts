"use client";

import { useEffect, useRef, useState } from "react";

type Quote = { last: number; prevClose: number };

export function useQuotes(keys: string[], intervalMs = 3000) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const inflight = useRef(false);
  const key = keys.filter(Boolean).slice().sort().join(",");
  const list = key ? key.split(",") : [];

  useEffect(() => {
    if (!list.length) return;
    let cancelled = false;
    const load = async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const res = await fetch(`/api/quotes?keys=${encodeURIComponent(list.join(","))}`, { cache: "no-store" });
        const json = (await res.json()) as { quotes?: Record<string, Quote> };
        if (!cancelled && json.quotes) setQuotes(json.quotes);
      } catch {
        /* keep last tick */
      } finally {
        inflight.current = false;
      }
    };
    void load();
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key, intervalMs]);

  return quotes;
}
