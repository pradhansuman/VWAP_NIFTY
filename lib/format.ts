export function inr(n: number, digits = n >= 1000 ? 2 : 2) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function pct(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function rsiLabel(n: number) {
  return n.toFixed(1);
}

export function formatIstTime(ms: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "short",
  }).format(ms);
}

export function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n >= 1000 ? 2 : 2,
    maximumFractionDigits: n >= 1000 ? 2 : 2,
  }).format(n);
}

export function formatUtcTime(ms: number) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "short",
  }).format(ms) + " UTC";
}
