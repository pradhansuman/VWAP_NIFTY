"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  BarChart3,
  Building2,
  Coins,
  Crosshair,
  ExternalLink,
  Gauge,
  Landmark,
  Plug,
  Radar,
  Workflow,
} from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import { openIndexWindow } from "@/lib/popout";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/nifty", label: "Nifty", icon: Landmark },
  { href: "/banknifty", label: "Bank Nifty", icon: Building2 },
  { href: "/sensex", label: "Sensex", icon: BarChart3 },
  { href: "/bitcoin", label: "Bitcoin", icon: Coins },
  { href: "/", label: "Stocks desk", icon: Gauge },
  { href: "/scanner", label: "Mean reversion", icon: Radar },
  { href: "/anchor", label: "Anchored VWAP", icon: Crosshair },
  { href: "/confluence", label: "Confluence", icon: Workflow },
  { href: "/playbook", label: "15m playbook", icon: BookOpen },
  { href: "/backtest", label: "Backtest", icon: Activity },
  { href: "/connect", label: "Upstox", icon: Plug },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const popout = pathname.startsWith("/window/");
  const bitcoin = pathname.startsWith("/bitcoin");
  const niftyWin = pathname === "/nifty" || pathname.startsWith("/window/nifty");
  const bankWin = pathname === "/banknifty" || pathname.startsWith("/window/banknifty");
  const sensexWin = pathname === "/sensex" || pathname.startsWith("/window/sensex");
  const deskLabel = niftyWin
    ? "Nifty 50 window"
    : bankWin
      ? "Bank Nifty window"
      : sensexWin
        ? "Sensex window"
        : bitcoin
          ? "Bitcoin desk"
          : "Nifty options desk";
  const deskTitle = niftyWin
    ? "Nifty 50 VWAP + RSI"
    : bankWin
      ? "Bank Nifty VWAP + RSI"
      : sensexWin
        ? "Sensex VWAP + RSI"
        : bitcoin
          ? "BTCUSDT VWAP + RSI"
          : "VWAP + RSI applications";
  const deskHint = niftyWin
    ? "Standalone Nifty 50 tape, PCR, ATM options, and 15m CE/PE playbook."
    : bankWin
      ? "Standalone Bank Nifty tape, PCR, ATM options, and 15m CE/PE playbook."
      : sensexWin
        ? "Standalone Sensex tape, PCR, ATM options, and 15m CE/PE playbook."
        : bitcoin
          ? "UTC-day VWAP and RSI on live BTCUSDT. Isolated from the Nifty tape."
          : "Session VWAP bands, RSI slope, and PCR bias on a Nifty 50 / options watchlist.";

  if (popout) {
    return (
      <div className="flex min-h-full flex-col bg-[#071018] text-zinc-100">
        <header className="border-b border-white/10 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.18em] text-teal-300/80 uppercase">{deskLabel}</p>
              <h1 className="truncate text-sm font-semibold tracking-tight">{deskTitle}</h1>
            </div>
            <SourceChip />
          </div>
        </header>
        <main className="w-full flex-1 px-3 py-3">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#071018] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071018]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-teal-300/80 uppercase">
              {deskLabel}
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {deskTitle}
            </h1>
          </div>
          <div className="flex min-w-0 flex-col items-end gap-2 sm:max-w-md">
            {!bitcoin && <SourceChip />}
            <p className="hidden text-right text-xs text-zinc-400 sm:block">
              {deskHint}
            </p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 pb-2">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <span key={link.href} className="inline-flex shrink-0 items-center">
                <Link
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active ||
                      (link.href === "/bitcoin" && bitcoin) ||
                      (link.href === "/nifty" && niftyWin) ||
                      (link.href === "/banknifty" && bankWin) ||
                      (link.href === "/sensex" && sensexWin)
                      ? "bg-teal-400/15 text-teal-200"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                  )}
                >
                  <Icon className="size-3.5" />
                  {link.label}
                </Link>
                {(link.href === "/nifty" || link.href === "/banknifty" || link.href === "/sensex") && (
                  <button
                    type="button"
                    title={`Open ${link.label} in a separate window`}
                    onClick={() =>
                      openIndexWindow(
                        link.href === "/nifty" ? "NIFTY" : link.href === "/banknifty" ? "BANKNIFTY" : "SENSEX",
                      )
                    }
                    className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-teal-200"
                  >
                    <ExternalLink className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">{children}</main>
      <footer className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-zinc-500">
        Simulated fallback when Upstox is disconnected. Live candles are research-only — not investment advice.
      </footer>
    </div>
  );
}
