import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Nifty VWAP + RSI desk",
  description:
    "Multi-timeframe VWAP and RSI dashboard, mean-reversion scanner, anchored VWAP confirmation, and a reclaim backtester for Nifty options.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" style={{ isolation: "isolate" }} suppressHydrationWarning>
        <TooltipProvider>
          <Shell>{children}</Shell>
        </TooltipProvider>
      </body>
    </html>
  );
}
