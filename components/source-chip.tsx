"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plug } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = {
  connected: boolean;
  hasApiKey: boolean;
  canOauth: boolean;
  tokenFromEnv: boolean;
};

export function SourceChip() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/upstox/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  const live = Boolean(status?.connected);
  return (
    <Link
      href="/connect"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        live ? "bg-teal-400/15 text-teal-200" : "bg-white/8 text-zinc-300 hover:bg-white/12",
      )}
    >
      <Plug className="size-3" />
      {live ? (status?.tokenFromEnv ? "Upstox live (env)" : "Upstox live") : "Simulated · Connect Upstox"}
    </Link>
  );
}
