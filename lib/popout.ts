export type IndexWindowId = "NIFTY" | "BANKNIFTY" | "SENSEX";

const SPECS: Record<
  IndexWindowId,
  { path: string; name: string; width: number; height: number; slot: number }
> = {
  NIFTY: { path: "/window/nifty", name: "nifty-vwap-window", width: 1280, height: 860, slot: 0 },
  BANKNIFTY: { path: "/window/banknifty", name: "banknifty-vwap-window", width: 1280, height: 860, slot: 1 },
  SENSEX: { path: "/window/sensex", name: "sensex-vwap-window", width: 1280, height: 860, slot: 2 },
};

export function openIndexWindow(symbol: IndexWindowId) {
  if (typeof window === "undefined") return;
  const spec = SPECS[symbol];
  const avail = window.screen.availWidth || 1600;
  const left = Math.max(16, 24 + spec.slot * Math.min(420, Math.floor(avail / 3)));
  const top = 48;
  const features = [
    "popup=yes",
    `width=${spec.width}`,
    `height=${spec.height}`,
    `left=${left}`,
    `top=${top}`,
    "menubar=no",
    "toolbar=no",
    "location=yes",
    "status=no",
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");
  const win = window.open(spec.path, spec.name, features);
  win?.focus();
  if (!win) {
    window.open(spec.path, spec.name);
  }
}
