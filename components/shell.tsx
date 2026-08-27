"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Crosshair, Gauge, Radar, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "MTF desk", icon: Gauge },
  { href: "/scanner", label: "Mean reversion", icon: Radar },
  { href: "/anchor", label: "Anchored VWAP", icon: Crosshair },
  { href: "/confluence", label: "Confluence", icon: Workflow },
  { href: "/backtest", label: "Backtest", icon: Activity },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col bg-[#071018] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071018]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-teal-300/80 uppercase">
              Nifty options desk
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              VWAP + RSI applications
            </h1>
          </div>
          <p className="hidden max-w-sm text-right text-xs text-zinc-400 sm:block">
            Session VWAP bands, RSI slope, and PCR bias on a Nifty 50 / options watchlist.
          </p>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 pb-2">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-teal-400/15 text-teal-200"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">{children}</main>
      <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-zinc-500">
        Simulated NSE session replay for research — not live HDFC/broker quotes and not investment advice.
      </footer>
    </div>
  );
}
