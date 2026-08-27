export type IndexWindowId = "NIFTY" | "BANKNIFTY";

const SPECS: Record<
  IndexWindowId,
  { path: string; name: string; width: number; height: number }
> = {
  NIFTY: { path: "/window/nifty", name: "nifty-vwap-window", width: 1280, height: 860 },
  BANKNIFTY: { path: "/window/banknifty", name: "banknifty-vwap-window", width: 1280, height: 860 },
};

export function openIndexWindow(symbol: IndexWindowId) {
  if (typeof window === "undefined") return;
  const spec = SPECS[symbol];
  const screenLeft = window.screenX ?? window.screenLeft ?? 0;
  const avail = window.screen.availWidth || 1600;
  const left = symbol === "NIFTY" ? Math.max(16, screenLeft + 16) : Math.max(16, Math.floor(avail / 2) - 40);
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
