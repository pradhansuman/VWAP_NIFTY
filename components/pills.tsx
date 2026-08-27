import { cn } from "@/lib/utils";
import { pct } from "@/lib/format";

export function Tone({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        value > 0 ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-zinc-400",
        className,
      )}
    >
      {pct(value)}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "long" | "short" | "neutral" | "warn";
}) {
  const map = {
    long: "bg-emerald-400/15 text-emerald-300",
    short: "bg-rose-400/15 text-rose-300",
    warn: "bg-amber-400/15 text-amber-200",
    neutral: "bg-white/8 text-zinc-300",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", map[tone])}>
      {children}
    </span>
  );
}
